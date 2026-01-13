/**
 * Indexer API Client
 * Provides fast access to announcements, deposits, and Merkle paths
 */

export interface IndexerConfig {
    apiUrl: string;
    wsUrl?: string;
}

export interface AnnouncementData {
    id: string;
    blockNumber: string;
    blockTimestamp: string;
    transactionHash: string;
    logIndex: number;
    schemeId: number;
    stealthAddress: string;
    caller: string;
    ephemeralPubKey: string;
    metadata: string;
}

export interface DepositData {
    id: string;
    blockNumber: string;
    blockTimestamp: string;
    transactionHash: string;
    logIndex: number;
    commitment: string;
    leafIndex: string;
    amount: string;
    depositor: string;
    isWithdrawn: boolean;
}

export interface MerklePathData {
    pathElements: string[];
    pathIndices: number[];
    root: string;
    leaf: string;
    leafIndex: number;
}

export interface IndexerStatus {
    lastBlockScanned: string;
    lastUpdateTime: string;
    announcementCount: number;
    depositCount: number;
    withdrawalCount: number;
    merkleTreeSize: number;
}

export class IndexerClient {
    private apiUrl: string;
    private wsUrl?: string;
    private ws?: WebSocket;

    constructor(config: IndexerConfig) {
        this.apiUrl = config.apiUrl.replace(/\/$/, ''); // Remove trailing slash
        this.wsUrl = config.wsUrl;
    }

    /**
     * Get indexer status
     */
    async getStatus(): Promise<IndexerStatus> {
        const response = await fetch(`${this.apiUrl}/api/status`);
        if (!response.ok) {
            throw new Error(`Failed to fetch status: ${response.statusText}`);
        }
        return response.json() as Promise<IndexerStatus>;
    }

    /**
     * Get announcements with optional filters
     */
    async getAnnouncements(params?: {
        fromBlock?: number;
        toBlock?: number;
        stealthAddress?: string;
        limit?: number;
        offset?: number;
    }): Promise<AnnouncementData[]> {
        const queryParams = new URLSearchParams();
        if (params?.fromBlock) queryParams.set('fromBlock', params.fromBlock.toString());
        if (params?.toBlock) queryParams.set('toBlock', params.toBlock.toString());
        if (params?.stealthAddress) queryParams.set('stealthAddress', params.stealthAddress);
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.offset) queryParams.set('offset', params.offset.toString());

        const url = `${this.apiUrl}/api/announcements?${queryParams.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch announcements: ${response.statusText}`);
        }

        return response.json() as Promise<AnnouncementData[]>;
    }

    /**
     * Get announcements for a specific stealth address
     */
    async getAnnouncementsForAddress(stealthAddress: string): Promise<AnnouncementData[]> {
        const response = await fetch(`${this.apiUrl}/api/announcements/${stealthAddress}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch announcements: ${response.statusText}`);
        }
        return response.json() as Promise<AnnouncementData[]>;
    }

    /**
     * Get deposits with optional filters
     */
    async getDeposits(params?: {
        fromBlock?: number;
        toBlock?: number;
        commitment?: string;
        limit?: number;
        offset?: number;
    }): Promise<DepositData[]> {
        const queryParams = new URLSearchParams();
        if (params?.fromBlock) queryParams.set('fromBlock', params.fromBlock.toString());
        if (params?.toBlock) queryParams.set('toBlock', params.toBlock.toString());
        if (params?.commitment) queryParams.set('commitment', params.commitment);
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.offset) queryParams.set('offset', params.offset.toString());

        const url = `${this.apiUrl}/api/deposits?${queryParams.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch deposits: ${response.statusText}`);
        }

        return response.json() as Promise<DepositData[]>;
    }

    /**
     * Get Merkle path for a commitment (required for withdrawals)
     */
    async getMerklePath(commitment: string): Promise<MerklePathData> {
        const response = await fetch(`${this.apiUrl}/api/merkle-path/${commitment}`);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Commitment not found in Merkle tree');
            }
            throw new Error(`Failed to fetch Merkle path: ${response.statusText}`);
        }
        return response.json() as Promise<MerklePathData>;
    }

    /**
     * Get current Merkle root
     */
    async getMerkleRoot(): Promise<{ root: string; leafCount: number }> {
        const response = await fetch(`${this.apiUrl}/api/merkle-root`);
        if (!response.ok) {
            throw new Error(`Failed to fetch Merkle root: ${response.statusText}`);
        }
        return response.json() as Promise<{ root: string; leafCount: number }>;
    }

    /**
     * Check if a nullifier has been used
     */
    async isNullifierUsed(nullifierHash: string): Promise<boolean> {
        const response = await fetch(`${this.apiUrl}/api/nullifier/${nullifierHash}`);
        if (!response.ok) {
            throw new Error(`Failed to check nullifier: ${response.statusText}`);
        }
        const data = (await response.json()) as { used: boolean };
        return data.used;
    }

    /**
     * Connect to WebSocket for real-time updates
     */
    connectWebSocket(callbacks: {
        onAnnouncement?: (data: AnnouncementData) => void;
        onDeposit?: (data: DepositData) => void;
        onWithdrawal?: (data: any) => void;
        onStatus?: (data: any) => void;
        onConnect?: () => void;
        onDisconnect?: () => void;
        onError?: (error: Error) => void;
    }): void {
        if (!this.wsUrl) {
            throw new Error('WebSocket URL not configured');
        }

        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            callbacks.onConnect?.();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                switch (message.type) {
                    case 'announcement':
                        callbacks.onAnnouncement?.(message.data);
                        break;
                    case 'deposit':
                        callbacks.onDeposit?.(message.data);
                        break;
                    case 'withdrawal':
                        callbacks.onWithdrawal?.(message.data);
                        break;
                    case 'status':
                        callbacks.onStatus?.(message.data);
                        break;
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            callbacks.onError?.(new Error('WebSocket error'));
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            callbacks.onDisconnect?.();
        };
    }

    /**
     * Disconnect WebSocket
     */
    disconnectWebSocket(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
    }

    /**
     * Scan for announcements (fast version using indexer)
     */
    async scanAnnouncementsIndexed(params: {
        viewPrivateKey: string;
        spendPrivateKey: string;
        fromBlock?: number;
        toBlock?: number;
    }): Promise<any[]> {
        // Import the stealth crypto functions
        const { computeStealthPrivateKey, checkStealthAddress } = await import('../crypto/stealth');

        // Get announcements from indexer
        const announcements = await this.getAnnouncements({
            fromBlock: params.fromBlock,
            toBlock: params.toBlock,
        });

        const payments: any[] = [];

        for (const announcement of announcements) {
            // Only process secp256k1 scheme
            if (announcement.schemeId !== 1) continue;

            try {
                // Compute stealth private key
                const stealthPrivKey = computeStealthPrivateKey(
                    params.viewPrivateKey,
                    params.spendPrivateKey,
                    announcement.ephemeralPubKey
                );

                // Check if this payment is for us
                const isForUs = checkStealthAddress(stealthPrivKey, announcement.stealthAddress);

                if (isForUs) {
                    payments.push({
                        stealthAddress: announcement.stealthAddress,
                        stealthPrivateKey: stealthPrivKey,
                        ephemeralPublicKey: announcement.ephemeralPubKey,
                        metadata: announcement.metadata,
                        blockNumber: parseInt(announcement.blockNumber),
                        transactionHash: announcement.transactionHash,
                    });
                }
            } catch (error) {
                // Not for us, skip
                continue;
            }
        }

        return payments;
    }
}

/**
 * Create an indexer client with default configuration
 */
export function createIndexerClient(config?: Partial<IndexerConfig>): IndexerClient {
    const defaultConfig: IndexerConfig = {
        apiUrl: config?.apiUrl || 'http://localhost:3001',
        wsUrl: config?.wsUrl || 'ws://localhost:3002',
    };

    return new IndexerClient(defaultConfig);
}
