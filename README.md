# Mantle Privacy Wallet

A complete stealth payments protocol on Mantle Network implementing the ERC-5564 standard with optional ZK-based amount hiding.

## Overview

This protocol enables private, non-interactive transfers of MNT and ERC-20 tokens where only the sender and recipient can link a payment to a recipient identity, while all on-chain activity remains publicly verifiable.

## Features

- ✅ **ERC-5564 Stealth Addresses** - Hide recipient identity using elliptic curve cryptography
- ✅ **Web Frontend** - Next.js app with wallet connection and payment flows
- ✅ **Mantle Network** - Deployed and working on Mantle Sepolia testnet
- ✅ **Send/Receive** - Full UI for sending and scanning private payments
- 🔒 **ZK Shielded Pool** (Coming Soon) - Hide transaction amounts using zero-knowledge proofs
- 🔗 **Indexer Service** (Coming Soon) - Fast announcement scanning with API

## Project Structure

This is a monorepo containing multiple packages:

```
mantle-privacy-wallet/
├── packages/
│   ├── contracts/          # Foundry smart contracts
│   ├── sdk/                # TypeScript SDK
│   ├── circuits/           # ZK circuits (coming soon)
│   ├── indexer/            # Event indexing service (coming soon)
│   └── frontend/           # Next.js frontend (coming soon)
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Foundry (forge, cast, anvil)

### Installation

```bash
# Clone the repository
git clone git@github.com:spidy-404/mantle-privacy-wallet.git
cd mantle-privacy-wallet

# Install dependencies
pnpm install
```

### Building

```bash
# Build all packages
pnpm build

# Build contracts only
pnpm contracts:build

# Build SDK only
cd packages/sdk && pnpm build
```

### Testing

```bash
# Test all packages
pnpm test

# Test contracts
pnpm contracts:test

# Test SDK
pnpm sdk:test
```

### Running the Frontend

```bash
# Navigate to frontend package
cd packages/frontend

# Start development server
pnpm dev

# Open http://localhost:3000 in your browser
```

**Using the App:**

1. **Connect Wallet**: Click "Connect Wallet" and connect MetaMask to Mantle Sepolia
2. **Generate Keys**: Go to "Keys" page and generate your stealth keypairs
3. **Get Testnet MNT**: Visit [Mantle Faucet](https://faucet.mantle.xyz) for test tokens
4. **Share Meta-Address**: Copy your stealth meta-address from the Keys page
5. **Send Payment**: Go to "Send", enter recipient's meta-address and amount
6. **Receive Payment**: Go to "Receive" and click "Scan for Payments"
7. **Withdraw**: Click "Withdraw" on any discovered payments

## Smart Contracts

### ERC5564Announcer

Emits standardized `Announcement` events for stealth payments following the ERC-5564 specification.

### StealthPay

Helper contract for sending MNT and ERC-20 tokens to stealth addresses with automatic announcements.

### ShieldedPool (Coming Soon)

Zero-knowledge based pool for hiding transaction amounts using Groth16 proofs and Poseidon Merkle trees.

## SDK Usage

```typescript
import {
  generateViewingKeypair,
  generateSpendingKeypair,
  generateStealthMetaAddress,
  generateStealthAddress,
  scanAnnouncements,
} from '@mantle-privacy/sdk';

// Recipient: Generate keys
const viewingKeypair = generateViewingKeypair();
const spendingKeypair = generateSpendingKeypair();
const metaAddress = generateStealthMetaAddress(
  viewingKeypair.publicKey,
  spendingKeypair.publicKey
);

// Sender: Generate stealth address
const { stealthAddress, ephemeralPubKey, metadata } = generateStealthAddress(metaAddress);

// Send payment to stealthAddress...

// Recipient: Scan for payments
const payments = await scanAnnouncements({
  viewPriv: viewingKeypair.privateKey,
  spendPriv: spendingKeypair.privateKey,
  fromBlock: 0,
  toBlock: 'latest',
});
```

## Deployment

### Mantle Sepolia Testnet

Contracts are deployed and verified on Mantle Sepolia testnet:

- **ERC5564Announcer**: [`0x0B7BeA2BD729faD217127610e950F316559C16b6`](https://sepolia.mantlescan.xyz/address/0x0B7BeA2BD729faD217127610e950F316559C16b6)
- **StealthPay**: [`0x357dd5dc38A3cA13840250FC67D523A62720902f`](https://sepolia.mantlescan.xyz/address/0x357dd5dc38A3cA13840250FC67D523A62720902f)

**Chain ID**: 5003
**RPC URL**: https://rpc.sepolia.mantle.xyz
**Explorer**: https://sepolia.mantlescan.xyz

### Deploying Contracts

```bash
cd packages/contracts

# Deploy to local testnet (anvil)
pnpm deploy:local

# Deploy to Mantle Sepolia
pnpm deploy:testnet
```

## How It Works

### Stealth Address Generation

1. Recipient publishes a **stealth meta-address** containing viewing and spending public keys
2. Sender generates an ephemeral keypair and computes a shared secret via ECDH
3. Sender derives a unique **stealth address** from the shared secret
4. Sender sends funds to the stealth address and posts an announcement
5. Recipient scans announcements and reconstructs the stealth private key to withdraw funds

### Privacy Guarantees

- **Unlinkability**: Each payment goes to a unique address
- **Recipient Privacy**: Only recipient can identify their payments
- **Amount Privacy** (with shielded pool): Transaction amounts are hidden
- **Non-Interactive**: Sender doesn't need to coordinate with recipient

### Known Privacy Limitations

Research shows that naive stealth address usage can allow 25-65% deanonymization through:
- Direct withdrawal to known addresses
- Timing patterns
- Gas token usage patterns

**Mitigations:**
- Use relayers for withdrawals
- Add random delays
- Use shielded pool for amounts
- Avoid predictable patterns

## Development

### Running Tests

```bash
# Contract tests
cd packages/contracts
forge test -vvv

# SDK tests
cd packages/sdk
pnpm test

# With coverage
forge coverage
pnpm test:coverage
```

### Code Style

```bash
# Format Solidity code
cd packages/contracts
forge fmt

# Lint TypeScript
cd packages/sdk
pnpm lint
```

## Roadmap

- [x] Phase 0: Project setup and monorepo structure
- [x] Phase 1: Core stealth addresses (ERC-5564) - **DEPLOYED TO TESTNET**
- [x] Phase 2: Frontend MVP - **FULLY FUNCTIONAL**
- [ ] Phase 3: ZK shielded pool
- [ ] Phase 4: Indexer service
- [ ] Phase 5: Security audit and privacy hardening
- [ ] Phase 6: Documentation and testing

## Security

This project is in active development and has not been audited. Use at your own risk.

- Smart contracts follow OpenZeppelin best practices
- Cryptography uses audited libraries (@noble/curves, @noble/hashes)
- Private keys stored in `.env` (never commit!)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) first.

## License

MIT

## References

- [ERC-5564: Stealth Addresses](https://eips.ethereum.org/EIPS/eip-5564)
- [Mantle Network Documentation](https://docs.mantle.xyz)
- [Umbra Protocol](https://app.umbra.cash)
- [Anonymity Analysis of Umbra](https://arxiv.org/abs/2308.01703)

## Contact

For questions and support, please open an issue on GitHub.
