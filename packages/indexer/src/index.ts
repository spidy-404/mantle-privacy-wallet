import 'dotenv/config';
import { EventScanner } from './scanner/event-scanner';
import { MerkleTreeBuilder } from './scanner/merkle-tree';
import { startServer, initializeAPI } from './api/server';
import { WebSocketManager } from './websocket/ws-server';

async function main() {
    console.log('🚀 Starting Mantle Privacy Indexer...\n');

    // Initialize Merkle tree
    console.log('1️⃣  Initializing Merkle tree...');
    const merkleTree = new MerkleTreeBuilder();
    await merkleTree.buildFromDatabase();
    console.log(`   Root: ${merkleTree.getCurrentRoot()}`);
    console.log(`   Leaves: ${merkleTree.getLeafCount()}\n`);

    // Initialize API with tree
    initializeAPI(merkleTree);

    // Start API server
    console.log('2️⃣  Starting API server...');
    const port = parseInt(process.env.PORT || '3001');
    startServer(port);
    console.log('');

    // Start WebSocket server
    console.log('3️⃣  Starting WebSocket server...');
    const wsPort = parseInt(process.env.WS_PORT || '3002');
    const wsManager = new WebSocketManager(wsPort);
    console.log('');

    // Start event scanner
    console.log('4️⃣  Starting event scanner...');
    const scanner = new EventScanner();
    await scanner.start();
    console.log('');

    console.log('✅ Indexer fully operational!\n');
    console.log('📊 Dashboard:');
    console.log(`   API:       http://localhost:${port}`);
    console.log(`   WebSocket: ws://localhost:${wsPort}`);
    console.log(`   Health:    http://localhost:${port}/health`);
    console.log(`   Status:    http://localhost:${port}/api/status\n`);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n\n🛑 Shutting down gracefully...');
        await scanner.stop();
        wsManager.close();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n\n🛑 Shutting down gracefully...');
        await scanner.stop();
        wsManager.close();
        process.exit(0);
    });

    // Rebuild Merkle tree periodically (every 5 minutes)
    setInterval(
        async () => {
            console.log('🔄 Rebuilding Merkle tree...');
            await merkleTree.buildFromDatabase();
            console.log(`   Updated: ${merkleTree.getLeafCount()} leaves`);

            // Broadcast status update
            wsManager.broadcastStatus({
                merkleRoot: merkleTree.getCurrentRoot(),
                leafCount: merkleTree.getLeafCount(),
            });
        },
        5 * 60 * 1000
    );
}

main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
