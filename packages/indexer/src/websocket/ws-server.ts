import { WebSocketServer, WebSocket } from 'ws';

export class WebSocketManager {
    private wss: WebSocketServer;
    private clients: Set<WebSocket> = new Set();

    constructor(port: number = 3002) {
        this.wss = new WebSocketServer({ port });

        this.wss.on('connection', (ws: WebSocket) => {
            console.log('📡 New WebSocket client connected');
            this.clients.add(ws);

            ws.on('close', () => {
                console.log('👋 WebSocket client disconnected');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });

            // Send welcome message
            ws.send(
                JSON.stringify({
                    type: 'connected',
                    timestamp: new Date().toISOString(),
                    message: 'Connected to Mantle Privacy Indexer',
                })
            );
        });

        console.log(`🔌 WebSocket server running on ws://localhost:${port}`);
    }

    // Broadcast new announcement
    broadcastAnnouncement(announcement: any) {
        this.broadcast({
            type: 'announcement',
            data: announcement,
            timestamp: new Date().toISOString(),
        });
    }

    // Broadcast new deposit
    broadcastDeposit(deposit: any) {
        this.broadcast({
            type: 'deposit',
            data: deposit,
            timestamp: new Date().toISOString(),
        });
    }

    // Broadcast new withdrawal
    broadcastWithdrawal(withdrawal: any) {
        this.broadcast({
            type: 'withdrawal',
            data: withdrawal,
            timestamp: new Date().toISOString(),
        });
    }

    // Broadcast scanner status update
    broadcastStatus(status: any) {
        this.broadcast({
            type: 'status',
            data: status,
            timestamp: new Date().toISOString(),
        });
    }

    private broadcast(message: any) {
        const data = JSON.stringify(message);
        let sent = 0;

        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
                sent++;
            }
        });

        if (sent > 0) {
            console.log(`📤 Broadcast ${message.type} to ${sent} clients`);
        }
    }

    getClientCount(): number {
        return this.clients.size;
    }

    close() {
        this.clients.forEach((client) => client.close());
        this.wss.close();
        console.log('🔌 WebSocket server closed');
    }
}
