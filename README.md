# Mantle Privacy Wallet

A complete privacy-preserving payment system on Mantle Network combining **stealth addresses** (ERC-5564) for recipient privacy and **zero-knowledge proofs** (Groth16) for amount privacy.

## What This Project Does

| Feature | Privacy Provided |
|---------|-----------------|
| **Stealth Addresses** | Hides WHO receives payments |
| **ZK Shielded Pool** | Hides HOW MUCH is being sent |

**Result**: Complete transaction privacy - sender, recipient, and amount are all hidden from blockchain observers.

---

## Quick Links

- [Full Technical Architecture](./docs/ARCHITECTURE.md) - How everything works
- [Demo & Pitch Script](./docs/DEMO_PITCH.md) - Step-by-step demo guide
- [Indexer Deployment](./packages/indexer/DEPLOYMENT.md) - Deploy the indexer service

---

## Live Demo

**Frontend**: https://mantle-privacy-wallet.vercel.app (or run locally)
**Network**: Mantle Sepolia Testnet (Chain ID: 5003)

---

## Local Setup (For Judges/Organizers)

Setting up locally gives you full control and the best demo experience. Follow these steps:

### Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | >= 18.0 | [nodejs.org](https://nodejs.org) |
| pnpm | >= 8.0 | `npm install -g pnpm` |
| PostgreSQL | >= 14 | [postgresql.org](https://postgresql.org/download) or Docker |
| Git | Any | [git-scm.com](https://git-scm.com) |

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/spidy-404/mantle-privacy-wallet.git
cd mantle-privacy-wallet

# Install all dependencies
pnpm install

# Build all packages
pnpm build
```

### Step 2: Set Up PostgreSQL Database

**Option A: Using Docker (Recommended)**
```bash
# Start PostgreSQL container
docker run --name privacy-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=privacy_indexer \
  -p 5432:5432 \
  -d postgres:14

# Verify it's running
docker ps
```

**Option B: Using Local PostgreSQL**
```bash
# Create database
createdb privacy_indexer

# Or via psql
psql -c "CREATE DATABASE privacy_indexer;"
```

### Step 3: Configure the Indexer

```bash
cd packages/indexer

# Copy example environment file
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/privacy_indexer"

# Mantle Sepolia RPC
RPC_URL="https://rpc.sepolia.mantle.xyz"

# Contract addresses (already deployed)
SHIELDED_POOL_ADDRESS="0xc6277cF453bE422e6BC04D4ff171840069c845f2"
ANNOUNCER_ADDRESS="0x4e59AfB497B33D3210A498fE12EB2D5ce787530c"

# Server
PORT=3001
WS_PORT=3002
```

### Step 4: Initialize Database and Start Indexer

```bash
# Still in packages/indexer directory

# Generate Prisma client and create tables
npx prisma generate
npx prisma db push

# Start the indexer
pnpm dev
```

You should see:
```
🚀 Starting Mantle Privacy Indexer...
✅ Tree built with X leaves
🚀 API server running on http://localhost:3001
✅ Indexer fully operational!
```

### Step 5: Configure and Start Frontend

```bash
# Open new terminal
cd packages/frontend

# Copy environment file
cp .env.example .env
```

Edit `.env`:
```env
# Use local indexer
NEXT_PUBLIC_INDEXER_API=http://localhost:3001

# Wallet Connect Project ID (get free at cloud.walletconnect.com)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

Start the frontend:
```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

### Step 6: Set Up MetaMask for Mantle Sepolia

1. Open MetaMask
2. Click Network dropdown → "Add Network" → "Add network manually"
3. Enter:
   - **Network Name**: Mantle Sepolia
   - **RPC URL**: https://rpc.sepolia.mantle.xyz
   - **Chain ID**: 5003
   - **Currency Symbol**: MNT
   - **Explorer**: https://sepolia.mantlescan.xyz

### Step 7: Get Test MNT

Visit the [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz) to get free test MNT.

---

## Testing the Full Flow

### Test 1: Stealth Address Payment

1. **Generate Keys**: Go to `/receive` → Click "Generate New Keys"
2. **Copy Meta-Address**: Copy your stealth meta-address (starts with `st:eth:`)
3. **Send Payment**: Go to `/send` → Paste meta-address → Enter amount → Click "Send"
4. **Scan**: Go back to `/receive` → Click "Scan for Payments"
5. **Withdraw**: Click "Withdraw" on the discovered payment

### Test 2: ZK Shielded Pool

1. **Deposit**: Go to `/shield` → Select 0.1 MNT → Click "Deposit to Pool"
2. **SAVE THE NOTE**: Download the deposit note JSON (CRITICAL!)
3. **Withdraw**: Paste the note → Enter recipient → Click "Withdraw"
4. **Wait**: ZK proof generation takes 30-60 seconds

---

## Project Structure

```
mantle-privacy-wallet/
├── packages/
│   ├── contracts/       # Solidity smart contracts (Foundry)
│   │   ├── src/
│   │   │   ├── ERC5564Announcer.sol   # Stealth announcement events
│   │   │   ├── StealthPay.sol         # Stealth payment helper
│   │   │   ├── ShieldedPool.sol       # ZK mixing pool
│   │   │   └── libraries/
│   │   │       ├── MerkleTree.sol     # Incremental Merkle tree
│   │   │       └── Poseidon.sol       # ZK-friendly hash
│   │   └── script/                    # Deployment scripts
│   │
│   ├── sdk/             # TypeScript cryptography SDK
│   │   └── src/
│   │       ├── crypto/                # Stealth address math
│   │       ├── scanner/               # Event scanning
│   │       └── zk/                    # ZK proof generation
│   │
│   ├── circuits/        # Circom ZK circuits
│   │   └── withdraw.circom            # Withdrawal proof circuit
│   │
│   ├── indexer/         # Backend indexing service
│   │   └── src/
│   │       ├── scanner/               # Blockchain event watcher
│   │       │   └── merkle-tree.ts     # Off-chain tree builder
│   │       └── api/                   # REST API endpoints
│   │
│   └── frontend/        # Next.js web application
│       └── app/
│           ├── send/                  # Stealth send UI
│           ├── receive/               # Payment scanner UI
│           └── shield/                # ZK pool UI
│
└── docs/
    ├── ARCHITECTURE.md  # Technical deep dive
    └── DEMO_PITCH.md    # Demo script for presentations
```

---

## Deployed Contracts (Mantle Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| ERC5564Announcer | `0x4e59AfB497B33D3210A498fE12EB2D5ce787530c` | Stealth payment events |
| StealthPay | `0x091870e699a7ca8C4bB16F829fb4fD0aB549CC5C` | Send stealth payments |
| PoseidonT3 | `0xc08E75955D081bE4Bc43a67f7F029115767B7155` | ZK-friendly hash |
| ShieldedPool | `0xc6277cF453bE422e6BC04D4ff171840069c845f2` | ZK mixing pool |

**Explorer**: https://sepolia.mantlescan.xyz

---

## Technology Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Blockchain | Mantle Sepolia | Low gas, fast, EVM compatible |
| Contracts | Solidity + Foundry | Industry standard |
| ZK Proofs | Circom + Groth16 | Battle-tested, small proofs |
| ZK Hash | Poseidon | 8x cheaper in circuits |
| SDK | TypeScript | Browser compatible |
| Crypto | @noble/curves | Audited, pure JS |
| Frontend | Next.js 14 | Modern React |
| Wallet | RainbowKit + wagmi | Best wallet UX |
| Database | PostgreSQL + Prisma | Reliable, type-safe |

---

## Troubleshooting

### "Commitment not found in Merkle tree"
The indexer hasn't synced the deposit yet. Wait 10 seconds and try again, or manually rebuild:
```bash
curl -X POST http://localhost:3001/api/rebuild-tree
```

### "Merkle root mismatch"
The indexer is out of sync. Rebuild the tree:
```bash
curl -X POST http://localhost:3001/api/rebuild-tree
```

### ZK proof generation fails
1. Check browser console for errors
2. Ensure circuit files exist in `packages/frontend/public/circuits/`
3. Try refreshing the page and generating again

### Database connection error
1. Ensure PostgreSQL is running: `docker ps` or `pg_isready`
2. Check DATABASE_URL in `.env` matches your setup

### MetaMask shows wrong network
1. Ensure you're on Mantle Sepolia (Chain ID: 5003)
2. If RPC is slow, try alternative: `https://rpc.sepolia.mantle.xyz`

---

## API Endpoints (Indexer)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/status` | GET | Indexer status and stats |
| `/api/deposits` | GET | List all deposits |
| `/api/merkle-path/:commitment` | GET | Get Merkle proof for withdrawal |
| `/api/rebuild-tree` | POST | Force rebuild Merkle tree |
| `/api/announcements` | GET | List stealth announcements |

---

## Security Notes

- **Not Audited**: This is hackathon code, not production-ready
- **Deposit Notes**: Lost notes = lost funds forever. Always backup!
- **Private Keys**: Never share your spending/viewing keys
- **Test Only**: Only use with testnet funds

---

## Documentation

- **[Architecture Guide](./docs/ARCHITECTURE.md)**: Complete technical overview, SDK functions, flow diagrams
- **[Demo Script](./docs/DEMO_PITCH.md)**: Step-by-step presentation guide with talking points
- **[Indexer Deployment](./packages/indexer/DEPLOYMENT.md)**: Deploy to Railway, Render, Fly.io, or Docker

---

## References

- [ERC-5564: Stealth Addresses](https://eips.ethereum.org/EIPS/eip-5564)
- [Mantle Network Docs](https://docs.mantle.xyz)
- [Circom Documentation](https://docs.circom.io)
- [Groth16 Paper](https://eprint.iacr.org/2016/260)

---

## License

MIT

---

## Contact

For questions during judging, please reach out or open an issue.
