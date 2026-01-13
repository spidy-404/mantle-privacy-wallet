import { createPublicClient, http, parseAbiItem, type Log } from 'viem';
import { PrismaClient } from '@prisma/client';
import { mantleSepolia } from '../config';

const prisma = new PrismaClient();

const publicClient = createPublicClient({
    chain: mantleSepolia,
    transport: http(process.env.RPC_URL),
});

// Contract addresses
const ERC5564_ANNOUNCER = process.env.ERC5564_ANNOUNCER as `0x${string}`;
const SHIELDED_POOL = process.env.SHIELDED_POOL as `0x${string}`;

// Event signatures
const ANNOUNCEMENT_EVENT = parseAbiItem(
    'event Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)'
);

const DEPOSIT_EVENT = parseAbiItem(
    'event Deposit(uint256 indexed commitment, uint256 leafIndex, uint256 amount, uint256 timestamp)'
);

const WITHDRAWAL_EVENT = parseAbiItem(
    'event Withdrawal(address indexed recipient, uint256 nullifierHash, uint256 amount, uint256 timestamp)'
);

export class EventScanner {
    private isScanning = false;
    private scanInterval: NodeJS.Timeout | null = null;

    async start() {
        console.log('🔍 Starting event scanner...');

        // Get last scanned block
        let state = await prisma.scannerState.findUnique({ where: { id: 1 } });
        if (!state) {
            const startBlock = BigInt(process.env.START_BLOCK || '0');
            state = await prisma.scannerState.create({
                data: {
                    id: 1,
                    lastBlockScanned: startBlock,
                    lastUpdateTime: new Date(),
                },
            });
        }

        console.log(`📍 Resuming from block ${state.lastBlockScanned}`);

        // Initial scan
        await this.scanEvents();

        // Start periodic scanning
        const interval = parseInt(process.env.SCAN_INTERVAL || '5000');
        this.scanInterval = setInterval(() => this.scanEvents(), interval);

        console.log(`✅ Scanner started (interval: ${interval}ms)`);
    }

    async stop() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        await prisma.$disconnect();
        console.log('🛑 Scanner stopped');
    }

    private async scanEvents() {
        if (this.isScanning) return;

        try {
            this.isScanning = true;

            const state = await prisma.scannerState.findUnique({ where: { id: 1 } });
            if (!state) return;

            const currentBlock = await publicClient.getBlockNumber();
            const fromBlock = state.lastBlockScanned + 1n;
            const blocksPerScan = BigInt(process.env.BLOCKS_PER_SCAN || '1000');
            const toBlock = fromBlock + blocksPerScan > currentBlock ? currentBlock : fromBlock + blocksPerScan;

            if (fromBlock > currentBlock) {
                // Already synced
                return;
            }

            console.log(`📡 Scanning blocks ${fromBlock} to ${toBlock}...`);

            // Scan announcements
            await this.scanAnnouncements(fromBlock, toBlock);

            // Scan deposits
            await this.scanDeposits(fromBlock, toBlock);

            // Scan withdrawals
            await this.scanWithdrawals(fromBlock, toBlock);

            // Update state
            await prisma.scannerState.update({
                where: { id: 1 },
                data: {
                    lastBlockScanned: toBlock,
                    lastUpdateTime: new Date(),
                },
            });

            const scannedBlocks = Number(toBlock - fromBlock + 1n);
            console.log(`✅ Scanned ${scannedBlocks} blocks (now at ${toBlock})`);
        } catch (error) {
            console.error('❌ Error scanning events:', error);
        } finally {
            this.isScanning = false;
        }
    }

    private async scanAnnouncements(fromBlock: bigint, toBlock: bigint) {
        const logs = await publicClient.getLogs({
            address: ERC5564_ANNOUNCER,
            event: ANNOUNCEMENT_EVENT,
            fromBlock,
            toBlock,
        });

        if (logs.length === 0) return;

        console.log(`  📢 Found ${logs.length} announcements`);

        for (const log of logs) {
            const { schemeId, stealthAddress, caller, ephemeralPubKey, metadata } = log.args;

            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

            await prisma.announcement.upsert({
                where: {
                    transactionHash_logIndex: {
                        transactionHash: log.transactionHash,
                        logIndex: log.logIndex,
                    },
                },
                create: {
                    blockNumber: log.blockNumber,
                    blockTimestamp: new Date(Number(block.timestamp) * 1000),
                    transactionHash: log.transactionHash,
                    logIndex: log.logIndex,
                    schemeId: Number(schemeId),
                    stealthAddress: stealthAddress as string,
                    caller: caller as string,
                    ephemeralPubKey: ephemeralPubKey as string,
                    metadata: metadata as string,
                },
                update: {},
            });
        }
    }

    private async scanDeposits(fromBlock: bigint, toBlock: bigint) {
        const logs = await publicClient.getLogs({
            address: SHIELDED_POOL,
            event: DEPOSIT_EVENT,
            fromBlock,
            toBlock,
        });

        if (logs.length === 0) return;

        console.log(`  💰 Found ${logs.length} deposits`);

        for (const log of logs) {
            const { commitment, leafIndex, amount, timestamp } = log.args;

            // Get depositor from transaction
            const tx = await publicClient.getTransaction({ hash: log.transactionHash });

            await prisma.deposit.upsert({
                where: {
                    transactionHash_logIndex: {
                        transactionHash: log.transactionHash,
                        logIndex: log.logIndex,
                    },
                },
                create: {
                    blockNumber: log.blockNumber,
                    blockTimestamp: new Date(Number(timestamp) * 1000),
                    transactionHash: log.transactionHash,
                    logIndex: log.logIndex,
                    commitment: commitment!.toString(),
                    leafIndex: leafIndex!,
                    amount: amount!.toString(),
                    depositor: tx.from,
                },
                update: {},
            });
        }
    }

    private async scanWithdrawals(fromBlock: bigint, toBlock: bigint) {
        const logs = await publicClient.getLogs({
            address: SHIELDED_POOL,
            event: WITHDRAWAL_EVENT,
            fromBlock,
            toBlock,
        });

        if (logs.length === 0) return;

        console.log(`  🏦 Found ${logs.length} withdrawals`);

        for (const log of logs) {
            const { recipient, nullifierHash, amount, timestamp } = log.args;

            await prisma.withdrawal.upsert({
                where: {
                    transactionHash_logIndex: {
                        transactionHash: log.transactionHash,
                        logIndex: log.logIndex,
                    },
                },
                create: {
                    blockNumber: log.blockNumber,
                    blockTimestamp: new Date(Number(timestamp) * 1000),
                    transactionHash: log.transactionHash,
                    logIndex: log.logIndex,
                    nullifierHash: nullifierHash!.toString(),
                    recipient: recipient as string,
                    amount: amount!.toString(),
                },
                update: {},
            });

            // Mark deposit as withdrawn (if we can find it by nullifier)
            // Note: This requires computing nullifier from commitment, which is private
            // So we just track withdrawals separately
        }
    }
}
