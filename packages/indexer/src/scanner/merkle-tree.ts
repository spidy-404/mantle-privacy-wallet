import { PrismaClient } from '@prisma/client';
import { buildPoseidon } from 'circomlibjs';
import { keccak256, numberToHex, pad } from 'viem';

const prisma = new PrismaClient();

const TREE_DEPTH = 20;
const MAX_LEAVES = 2 ** TREE_DEPTH; // 1,048,576

export interface MerklePath {
    pathElements: string[];
    pathIndices: number[];
    root: string;
    leaf: string;
    leafIndex: number;
}

export class MerkleTreeBuilder {
    private tree: Map<number, string[]> = new Map(); // level => [hashes]
    private leaves: string[] = [];
    private zeroHashes: string[] = [];
    private poseidon: any = null;

    async initialize() {
        // Build Poseidon hasher
        this.poseidon = await buildPoseidon();
        await this.initializeZeroHashes();
    }

    private async initializeZeroHashes() {
        // Use actual Poseidon zero hashes
        let currentZero = '0';
        this.zeroHashes.push(currentZero);

        for (let i = 0; i < TREE_DEPTH; i++) {
            currentZero = this.hash(currentZero, currentZero);
            this.zeroHashes.push(currentZero);
        }
    }

    private hash(left: string, right: string): string {
        // Use Keccak256 mod field size (matches the placeholder in contract)
        // TODO: Replace with real Poseidon once contract is updated
        const FIELD_SIZE = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

        const leftBigInt = BigInt(left);
        const rightBigInt = BigInt(right);

        // Convert to 32-byte hex strings (like abi.encodePacked in Solidity)
        const leftHex = pad(numberToHex(leftBigInt), { size: 32 });
        const rightHex = pad(numberToHex(rightBigInt), { size: 32 });

        // Concat and hash
        const combined = (leftHex + rightHex.slice(2)) as `0x${string}`; // Remove 0x from right
        const hashHex = keccak256(combined);
        const hashBigInt = BigInt(hashHex);

        return (hashBigInt % FIELD_SIZE).toString();
    }

    async buildFromDatabase(): Promise<void> {
        console.log('🌳 Building Merkle tree from database...');

        // Fetch all deposits ordered by leafIndex
        const deposits = await prisma.deposit.findMany({
            orderBy: { leafIndex: 'asc' },
        });

        console.log(`  📝 Found ${deposits.length} deposits`);

        // Build tree from commitments
        this.leaves = [];
        for (const deposit of deposits) {
            this.leaves.push(deposit.commitment);
        }

        if (this.leaves.length > MAX_LEAVES) {
            throw new Error('Tree is full!');
        }

        console.log(`✅ Tree built with ${this.leaves.length} leaves`);
    }

    async getMerklePath(commitment: string): Promise<MerklePath | null> {
        // Find the leaf index for this commitment
        const deposit = await prisma.deposit.findUnique({
            where: { commitment },
        });

        if (!deposit) {
            return null;
        }

        const leafIndex = Number(deposit.leafIndex);
        if (leafIndex >= this.leaves.length) {
            return null;
        }

        const pathElements: string[] = [];
        const pathIndices: number[] = [];

        let currentIndex = leafIndex;
        let currentHash = this.leaves[leafIndex];

        for (let level = 0; level < TREE_DEPTH; level++) {
            const isLeft = currentIndex % 2 === 0;
            const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

            let siblingHash: string;
            if (siblingIndex < this.leaves.length) {
                // Sibling exists in tree
                siblingHash = this.leaves[siblingIndex];
            } else {
                // Use zero hash for empty sibling
                siblingHash = this.zeroHashes[level];
            }

            pathElements.push(siblingHash);
            pathIndices.push(isLeft ? 0 : 1);

            // Compute parent hash
            const leftHash = isLeft ? currentHash : siblingHash;
            const rightHash = isLeft ? siblingHash : currentHash;
            currentHash = this.hash(leftHash, rightHash);

            currentIndex = Math.floor(currentIndex / 2);
        }

        return {
            pathElements,
            pathIndices,
            root: this.getCurrentRoot(), // Use the actual root from incremental tree
            leaf: this.leaves[leafIndex],
            leafIndex,
        };
    }

    getCurrentRoot(): string {
        if (this.leaves.length === 0) {
            return this.zeroHashes[TREE_DEPTH];
        }

        // Simulate incremental tree construction like the contract
        // This matches the contract's insert() function logic
        const filledSubtrees: { [level: number]: string } = {};

        // Initialize with zero hashes
        for (let i = 0; i < TREE_DEPTH; i++) {
            filledSubtrees[i] = this.zeroHashes[i];
        }

        let root = this.zeroHashes[TREE_DEPTH];

        // Process each leaf incrementally (like contract does)
        for (let leafIndex = 0; leafIndex < this.leaves.length; leafIndex++) {
            let currentIndex = leafIndex;
            let currentLevelHash = this.leaves[leafIndex];

            for (let level = 0; level < TREE_DEPTH; level++) {
                let left: string;
                let right: string;

                if (currentIndex % 2 === 0) {
                    // Left side - store this hash
                    left = currentLevelHash;
                    right = filledSubtrees[level];
                    filledSubtrees[level] = currentLevelHash;
                } else {
                    // Right side - pair with stored left
                    left = filledSubtrees[level];
                    right = currentLevelHash;
                }

                currentLevelHash = this.hash(left, right);
                currentIndex = Math.floor(currentIndex / 2);
            }

            root = currentLevelHash;
        }

        return root;
    }

    getLeafCount(): number {
        return this.leaves.length;
    }
}
