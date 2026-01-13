import { PrismaClient } from '@prisma/client';

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

    constructor() {
        this.initializeZeroHashes();
    }

    private initializeZeroHashes() {
        // Placeholder: In production, use actual Poseidon zero hashes
        // For now, use keccak256-based placeholders
        let currentZero = '0';
        this.zeroHashes.push(currentZero);

        for (let i = 0; i < TREE_DEPTH; i++) {
            // Simplified hash - in production, use Poseidon
            currentZero = this.hash(currentZero, currentZero);
            this.zeroHashes.push(currentZero);
        }
    }

    private hash(left: string, right: string): string {
        // Placeholder: Use keccak256 for now
        // In production, this should use Poseidon hash from circomlibjs
        const crypto = require('crypto');
        const combined = left + right.replace('0x', '');
        return '0x' + crypto.createHash('sha256').update(combined).digest('hex');
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

        const root = currentHash;

        return {
            pathElements,
            pathIndices,
            root,
            leaf: this.leaves[leafIndex],
            leafIndex,
        };
    }

    getCurrentRoot(): string {
        if (this.leaves.length === 0) {
            return this.zeroHashes[TREE_DEPTH];
        }

        let currentLevel = [...this.leaves];

        for (let level = 0; level < TREE_DEPTH; level++) {
            const nextLevel: string[] = [];
            const levelSize = Math.ceil(currentLevel.length / 2);

            for (let i = 0; i < levelSize; i++) {
                const leftIndex = i * 2;
                const rightIndex = leftIndex + 1;

                const left = currentLevel[leftIndex];
                const right =
                    rightIndex < currentLevel.length
                        ? currentLevel[rightIndex]
                        : this.zeroHashes[level];

                nextLevel.push(this.hash(left, right));
            }

            currentLevel = nextLevel;
        }

        return currentLevel[0];
    }

    getLeafCount(): number {
        return this.leaves.length;
    }
}
