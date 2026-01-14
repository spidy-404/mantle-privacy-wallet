# Mantle Privacy Wallet - Indexer Service

High-performance event indexing service for Mantle stealth payments. Provides 100x faster scanning compared to direct blockchain queries.

## Overview

The indexer service continuously monitors the Mantle Sepolia blockchain for:
- **Announcement events** from ERC5564Announcer contract
- **Deposit events** from ShieldedPool contract (ZK pool)
- **Withdrawal events** from ShieldedPool contract

All events are stored in PostgreSQL with proper indexing for fast queries. The service provides:
- **REST API** for querying indexed data
- **WebSocket** for real-time event notifications
- **Merkle path computation** for ZK withdrawal proofs

## Features

- ✅ Automatic blockchain scanning with configurable intervals
- ✅ PostgreSQL database with Prisma ORM
- ✅ REST API with filtering and pagination
- ✅ WebSocket server for real-time updates
- ✅ Merkle tree builder for ZK proof generation
- ✅ Automatic resume from last scanned block
- ✅ Health check endpoint for monitoring
- ✅ Docker support for easy deployment

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database (we use Supabase)

### Installation

```bash
# Navigate to indexer package
cd packages/indexer

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
pnpm prisma generate

# Push schema to database
pnpm prisma db push
```

### Development

```bash
# Start indexer in development mode (auto-reload)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The indexer will:
1. Connect to PostgreSQL database
2. Start scanning from `START_BLOCK` (or resume from last scanned block)
3. Serve REST API on `http://localhost:3001`
4. Serve WebSocket on `ws://localhost:3002`

## Configuration

Create a `.env` file with the following variables:

```bash
# Database URL (required)
DATABASE_URL=postgresql://user:password@host:5432/database

# Blockchain Configuration (required)
RPC_URL=https://rpc.sepolia.mantle.xyz
CHAIN_ID=5003

# Contract Addresses (required)
ERC5564_ANNOUNCER_ADDRESS=0x53aCb6c2C0f12A748DB84fbA00bf29d66b3B5259
SHIELDED_POOL_ADDRESS=0xa19cEbb855D7Ec92eB24b9DD33Fd3548CB458C19

# Scanning Configuration (optional)
START_BLOCK=11394476              # Block to start scanning from
BLOCKS_PER_SCAN=1000              # Number of blocks to scan per iteration
SCAN_INTERVAL=5000                # Milliseconds between scans

# Server Configuration (optional)
PORT=3001                         # REST API port
WS_PORT=3002                      # WebSocket port
```

## API Reference

### Health Check

```bash
GET /health
```

Returns `200 OK` if service is running.

### Get Status

```bash
GET /api/status
```

Returns indexer sync status:

```json
{
  "lastBlockScanned": "11405123",
  "lastUpdateTime": "2024-01-14T10:30:00.000Z",
  "announcementCount": 45,
  "depositCount": 12,
  "withdrawalCount": 3,
  "merkleTreeSize": 12
}
```

### Get Announcements

```bash
GET /api/announcements?fromBlock=11400000&toBlock=11410000&limit=100&offset=0
```

Query parameters:
- `fromBlock` (optional) - Start block number
- `toBlock` (optional) - End block number
- `stealthAddress` (optional) - Filter by stealth address
- `limit` (optional, default: 100) - Number of results
- `offset` (optional, default: 0) - Pagination offset

Returns array of announcements:

```json
[
  {
    "id": "clx123...",
    "blockNumber": "11405000",
    "blockTimestamp": "2024-01-14T10:00:00.000Z",
    "transactionHash": "0xabc...",
    "logIndex": 0,
    "schemeId": 1,
    "stealthAddress": "0x123...",
    "caller": "0xdef...",
    "ephemeralPubKey": "0x04...",
    "metadata": "0x00"
  }
]
```

### Get Deposits

```bash
GET /api/deposits?fromBlock=11400000&limit=50
```

Query parameters:
- `fromBlock` (optional) - Start block number
- `toBlock` (optional) - End block number
- `commitment` (optional) - Filter by commitment hash
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

Returns array of deposits.

### Get Merkle Path

```bash
GET /api/merkle-path/:commitment
```

Returns Merkle path for a specific commitment (required for ZK withdrawals):

```json
{
  "pathElements": ["0x123...", "0x456...", ...],
  "pathIndices": [0, 1, 0, ...],
  "root": "0x789...",
  "leaf": "0xabc...",
  "leafIndex": 5
}
```

Returns `404` if commitment not found.

### Get Merkle Root

```bash
GET /api/merkle-root
```

Returns current Merkle root:

```json
{
  "root": "0x789...",
  "leafCount": 12
}
```

### Check Nullifier

```bash
GET /api/nullifier/:nullifierHash
```

Check if a nullifier has been used (prevents double-spending):

```json
{
  "used": true
}
```

### Get Withdrawals

```bash
GET /api/withdrawals?limit=50
```

Returns array of withdrawals.

## WebSocket API

Connect to `ws://localhost:3002` to receive real-time updates.

### Message Format

```json
{
  "type": "announcement" | "deposit" | "withdrawal" | "status",
  "data": { ... },
  "timestamp": "2024-01-14T10:30:00.000Z"
}
```

### Example Usage

```javascript
const ws = new WebSocket('ws://localhost:3002');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'announcement':
      console.log('New announcement:', message.data);
      break;
    case 'deposit':
      console.log('New deposit:', message.data);
      break;
    case 'withdrawal':
      console.log('New withdrawal:', message.data);
      break;
    case 'status':
      console.log('Status update:', message.data);
      break;
  }
};
```

## Database Schema

### Announcement

Stores ERC-5564 announcement events:

- `id` - Unique identifier
- `blockNumber` - Block where event occurred
- `blockTimestamp` - Block timestamp
- `transactionHash` - Transaction hash
- `logIndex` - Log index in transaction
- `schemeId` - Stealth scheme ID (1 = secp256k1)
- `stealthAddress` - Generated stealth address
- `caller` - Address that made the announcement
- `ephemeralPubKey` - Ephemeral public key (for ECDH)
- `metadata` - Additional metadata

**Indexes:** `blockNumber`, `stealthAddress`, unique `(transactionHash, logIndex)`

### Deposit

Stores shielded pool deposit events:

- `id` - Unique identifier
- `blockNumber` - Block where deposit occurred
- `blockTimestamp` - Block timestamp
- `transactionHash` - Transaction hash
- `logIndex` - Log index
- `commitment` - Poseidon commitment hash (unique)
- `leafIndex` - Index in Merkle tree (unique)
- `amount` - Deposit amount in wei
- `depositor` - Address that made deposit
- `isWithdrawn` - Whether deposit has been withdrawn

**Indexes:** `commitment`, `leafIndex`

### Withdrawal

Stores shielded pool withdrawal events:

- `id` - Unique identifier
- `nullifierHash` - Nullifier hash (unique, prevents double-spend)
- `recipient` - Withdrawal recipient address
- `amount` - Withdrawal amount in wei
- `blockNumber` - Block where withdrawal occurred
- `blockTimestamp` - Block timestamp

**Index:** `nullifierHash` (unique)

### ScannerState

Tracks scanning progress (singleton):

- `id` - Always 1
- `lastBlockScanned` - Last fully scanned block
- `lastUpdateTime` - Auto-updated timestamp

## Architecture

```
┌─────────────────┐
│  Mantle Sepolia │
│   Blockchain    │
└────────┬────────┘
         │
         │ (viem)
         ↓
┌─────────────────┐
│  Event Scanner  │
│  - Announcements│
│  - Deposits     │
│  - Withdrawals  │
└────────┬────────┘
         │
         │ (Prisma)
         ↓
┌─────────────────┐
│   PostgreSQL    │
│   (Supabase)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ↓         ↓
┌────────┐ ┌──────────┐
│REST API│ │WebSocket │
│:3001   │ │:3002     │
└────────┘ └──────────┘
    │         │
    │         │
    ↓         ↓
┌─────────────────┐
│  Frontend SDK   │
│  (React/Next.js)│
└─────────────────┘
```

## Performance

### Scanning Speed

- **Direct RPC:** 10+ seconds to scan 10,000 blocks
- **Indexer API:** <1 second to query 10,000 events

Performance gains:
- 100x faster announcement scanning
- Instant Merkle path computation
- Real-time event notifications

### Optimization Tips

1. **Increase `BLOCKS_PER_SCAN`** for faster initial sync
2. **Add database indexes** (already included in schema)
3. **Use connection pooling** in DATABASE_URL
4. **Cache Merkle root** in production
5. **Add Redis** for frequently accessed data

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:

- Railway (recommended)
- Render
- Fly.io
- Docker
- VPS (DigitalOcean, AWS, etc.)

### Quick Docker Deployment

```bash
# Build image
docker build -f Dockerfile -t mantle-privacy-indexer .

# Run container
docker run -d \
  -p 3001:3001 \
  -p 3002:3002 \
  -e DATABASE_URL="your-db-url" \
  -e RPC_URL="https://rpc.sepolia.mantle.xyz" \
  mantle-privacy-indexer
```

Or use Docker Compose:

```bash
docker-compose up -d
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

### Logs

```bash
# Development
pnpm dev  # Shows logs in terminal

# Production (PM2)
pm2 logs mantle-indexer

# Docker
docker logs -f mantle-privacy-indexer
```

### Metrics

Monitor these key metrics:
- `lastBlockScanned` - Current sync progress
- `announcementCount` - Total announcements indexed
- `depositCount` - Total deposits in Merkle tree
- `merkleTreeSize` - Number of leaves in tree

## Troubleshooting

### Indexer not syncing

1. Check RPC connection:
   ```bash
   curl -X POST $RPC_URL \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

2. Verify contract addresses match deployed contracts
3. Check database connection
4. Review logs for errors

### "Commitment not found" error

The deposit may not be indexed yet. Check:
1. Indexer sync status: `GET /api/status`
2. Wait for indexer to catch up to latest block
3. Verify deposit transaction confirmed on-chain

### WebSocket connection issues

1. Ensure port 3002 is exposed
2. Check firewall rules
3. Test connection:
   ```bash
   npm install -g wscat
   wscat -c ws://localhost:3002
   ```

## Development

### Adding New Events

1. Update Prisma schema in `prisma/schema.prisma`
2. Generate client: `pnpm prisma generate`
3. Push to database: `pnpm prisma db push`
4. Add scanner logic in `src/scanner/event-scanner.ts`
5. Add API endpoint in `src/api/server.ts`
6. Update WebSocket broadcasts in `src/websocket/ws-server.ts`

### Testing

```bash
# Run indexer locally
pnpm dev

# Test API endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/status
curl http://localhost:3001/api/announcements?limit=5

# Test WebSocket
wscat -c ws://localhost:3002
```

## Security

- ✅ CORS enabled for cross-origin requests
- ✅ Environment variables for sensitive data
- ✅ Health check for monitoring
- ⏳ Rate limiting (to be added)
- ⏳ API authentication (to be added for production)

For production:
1. Add rate limiting with `express-rate-limit`
2. Enable HTTPS/WSS
3. Restrict CORS origins
4. Add API key authentication
5. Use read-only database credentials

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Support

For issues or questions:
- Open a GitHub issue
- Check logs first
- Include error messages and environment details
