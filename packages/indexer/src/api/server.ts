import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { MerkleTreeBuilder } from '../scanner/merkle-tree';

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Merkle tree instance
let merkleTree: MerkleTreeBuilder;

export function initializeAPI(tree: MerkleTreeBuilder) {
    merkleTree = tree;
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get scanner status
app.get('/api/status', async (req, res) => {
    try {
        const state = await prisma.scannerState.findUnique({ where: { id: 1 } });
        const announcementCount = await prisma.announcement.count();
        const depositCount = await prisma.deposit.count();
        const withdrawalCount = await prisma.withdrawal.count();

        res.json({
            lastBlockScanned: state?.lastBlockScanned.toString() || '0',
            lastUpdateTime: state?.lastUpdateTime,
            announcementCount,
            depositCount,
            withdrawalCount,
            merkleTreeSize: merkleTree?.getLeafCount() || 0,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get announcements
app.get('/api/announcements', async (req, res) => {
    try {
        const { fromBlock, toBlock, stealthAddress, limit = '100', offset = '0' } = req.query;

        const where: any = {};
        if (fromBlock) where.blockNumber = { gte: BigInt(fromBlock as string) };
        if (toBlock) where.blockNumber = { ...where.blockNumber, lte: BigInt(toBlock as string) };
        if (stealthAddress) where.stealthAddress = stealthAddress as string;

        const announcements = await prisma.announcement.findMany({
            where,
            orderBy: { blockNumber: 'desc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string),
        });

        // Convert BigInt to string for JSON serialization
        const serialized = announcements.map((a) => ({
            ...a,
            blockNumber: a.blockNumber.toString(),
        }));

        res.json(serialized);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific announcement by stealth address
app.get('/api/announcements/:stealthAddress', async (req, res) => {
    try {
        const { stealthAddress } = req.params;

        const announcements = await prisma.announcement.findMany({
            where: { stealthAddress },
            orderBy: { blockNumber: 'desc' },
        });

        const serialized = announcements.map((a) => ({
            ...a,
            blockNumber: a.blockNumber.toString(),
        }));

        res.json(serialized);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get deposits
app.get('/api/deposits', async (req, res) => {
    try {
        const { fromBlock, toBlock, commitment, limit = '100', offset = '0' } = req.query;

        const where: any = {};
        if (fromBlock) where.blockNumber = { gte: BigInt(fromBlock as string) };
        if (toBlock) where.blockNumber = { ...where.blockNumber, lte: BigInt(toBlock as string) };
        if (commitment) where.commitment = commitment as string;

        const deposits = await prisma.deposit.findMany({
            where,
            orderBy: { leafIndex: 'asc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string),
        });

        const serialized = deposits.map((d) => ({
            ...d,
            blockNumber: d.blockNumber.toString(),
            leafIndex: d.leafIndex.toString(),
        }));

        res.json(serialized);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get Merkle path for a commitment
app.get('/api/merkle-path/:commitment', async (req, res) => {
    try {
        const { commitment } = req.params;

        if (!merkleTree) {
            return res.status(503).json({ error: 'Merkle tree not initialized' });
        }

        const path = await merkleTree.getMerklePath(commitment);

        if (!path) {
            return res.status(404).json({ error: 'Commitment not found in tree' });
        }

        res.json(path);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get current Merkle root
app.get('/api/merkle-root', async (req, res) => {
    try {
        if (!merkleTree) {
            return res.status(503).json({ error: 'Merkle tree not initialized' });
        }

        const root = merkleTree.getCurrentRoot();
        const leafCount = merkleTree.getLeafCount();

        res.json({ root, leafCount });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get withdrawals
app.get('/api/withdrawals', async (req, res) => {
    try {
        const { fromBlock, toBlock, recipient, nullifierHash, limit = '100', offset = '0' } =
            req.query;

        const where: any = {};
        if (fromBlock) where.blockNumber = { gte: BigInt(fromBlock as string) };
        if (toBlock) where.blockNumber = { ...where.blockNumber, lte: BigInt(toBlock as string) };
        if (recipient) where.recipient = recipient as string;
        if (nullifierHash) where.nullifierHash = nullifierHash as string;

        const withdrawals = await prisma.withdrawal.findMany({
            where,
            orderBy: { blockNumber: 'desc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string),
        });

        const serialized = withdrawals.map((w) => ({
            ...w,
            blockNumber: w.blockNumber.toString(),
        }));

        res.json(serialized);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Check if nullifier has been used
app.get('/api/nullifier/:nullifierHash', async (req, res) => {
    try {
        const { nullifierHash } = req.params;

        const withdrawal = await prisma.withdrawal.findUnique({
            where: { nullifierHash },
        });

        res.json({
            nullifierHash,
            used: !!withdrawal,
            withdrawal: withdrawal
                ? {
                      ...withdrawal,
                      blockNumber: withdrawal.blockNumber.toString(),
                  }
                : null,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Manually trigger Merkle tree rebuild
app.post('/api/rebuild-tree', async (req, res) => {
    try {
        if (!merkleTree) {
            res.status(503).json({ error: 'Merkle tree not initialized' });
            return;
        }

        console.log('🔄 Manual Merkle tree rebuild triggered...');
        await merkleTree.buildFromDatabase();

        res.json({
            success: true,
            message: 'Merkle tree rebuilt successfully',
            root: merkleTree.getCurrentRoot(),
            leafCount: merkleTree.getLeafCount(),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export function startServer(port: number = 3001) {
    app.listen(port, () => {
        console.log(`🚀 API server running on http://localhost:${port}`);
        console.log(`   Health: http://localhost:${port}/health`);
        console.log(`   Status: http://localhost:${port}/api/status`);
    });
}

export { app };
