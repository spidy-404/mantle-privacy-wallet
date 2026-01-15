import { PrismaClient } from '@prisma/client';
import { buildPoseidon } from 'circomlibjs';

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
        // Use real Poseidon hash (matches the contract with deployed Poseidon)
        if (!this.poseidon) {
            throw new Error('Poseidon hasher not initialized. Call initialize() first.');
        }

        const leftBigInt = BigInt(left);
        const rightBigInt = BigInt(right);

        // Compute Poseidon hash
        const hashResult = this.poseidon([leftBigInt, rightBigInt]);
        return this.poseidon.F.toString(hashResult);
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

        const targetLeafIndex = Number(deposit.leafIndex);
        if (targetLeafIndex >= this.leaves.length) {
            return null;
        }

        // Use incremental tree algorithm matching the contract exactly
        // We need to track filledSubtrees after each insertion to get correct siblings
        const filledSubtrees: string[] = [...this.zeroHashes.slice(0, TREE_DEPTH)];

        // Store the filledSubtrees state BEFORE each leaf insertion
        // This is needed because when leaf N is inserted, its left siblings
        // are the filledSubtrees values from BEFORE leaf N was inserted
        const filledSubtreesHistory: string[][] = [];

        // Insert all leaves up to the current state
        for (let leafIdx = 0; leafIdx < this.leaves.length; leafIdx++) {
            // Save state BEFORE this insertion
            filledSubtreesHistory.push([...filledSubtrees]);

            let currentIndex = leafIdx;
            let currentHash = this.leaves[leafIdx];

            for (let level = 0; level < TREE_DEPTH; level++) {
                if (currentIndex % 2 === 0) {
                    // Even index: we're on the left (READ before UPDATE)
                    const right = filledSubtrees[level];
                    filledSubtrees[level] = currentHash;
                    currentHash = this.hash(currentHash, right);
                } else {
                    // Odd index: we're on the right, pair with left sibling
                    currentHash = this.hash(filledSubtrees[level], currentHash);
                }
                currentIndex = Math.floor(currentIndex / 2);
            }
        }

        // Build the Merkle path for the target leaf
        // The sibling at each level is ALWAYS the filledSubtrees value BEFORE our leaf was inserted
        // This is because the contract reads filledSubtrees[i] BEFORE updating it
        const pathElements: string[] = [];
        const pathIndices: number[] = [];
        let currentIndex = targetLeafIndex;

        for (let level = 0; level < TREE_DEPTH; level++) {
            const isLeft = currentIndex % 2 === 0;
            // Always use the filledSubtrees state from BEFORE this leaf was inserted
            pathElements.push(filledSubtreesHistory[targetLeafIndex][level]);
            pathIndices.push(isLeft ? 0 : 1);
            currentIndex = Math.floor(currentIndex / 2);
        }

        return {
            pathElements,
            pathIndices,
            root: this.getCurrentRoot(),
            leaf: this.leaves[targetLeafIndex],
            leafIndex: targetLeafIndex,
        };
    }

    getCurrentRoot(): string {
        if (this.leaves.length === 0) {
            return this.zeroHashes[TREE_DEPTH];
        }

        // Incremental tree algorithm matching the contract EXACTLY
        const filledSubtrees: string[] = [...this.zeroHashes.slice(0, TREE_DEPTH)];
        let root = this.zeroHashes[TREE_DEPTH];

        for (let leafIdx = 0; leafIdx < this.leaves.length; leafIdx++) {
            let currentIndex = leafIdx;
            let currentHash = this.leaves[leafIdx];

            for (let level = 0; level < TREE_DEPTH; level++) {
                if (currentIndex % 2 === 0) {
                    // Even: left = current, right = filledSubtrees (READ before UPDATE)
                    const right = filledSubtrees[level];
                    filledSubtrees[level] = currentHash;
                    currentHash = this.hash(currentHash, right);
                } else {
                    // Odd: left = filledSubtrees, right = current
                    currentHash = this.hash(filledSubtrees[level], currentHash);
                }
                currentIndex = Math.floor(currentIndex / 2);
            }
            root = currentHash;
        }

        return root;
    }

    getLeafCount(): number {
        return this.leaves.length;
    }
}
