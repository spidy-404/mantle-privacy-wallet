# Mantle Privacy Wallet - Technical Architecture

## Overview

Mantle Privacy Wallet is a privacy-preserving payment system built on Mantle Network that combines two powerful privacy technologies:

1. **Stealth Addresses (ERC-5564)** - Hide recipient identity
2. **ZK Shielded Pool** - Hide transaction amounts using zero-knowledge proofs

This creates a complete privacy solution where **neither the sender, recipient, nor amount** can be traced on-chain.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   /send     │  │  /receive   │  │   /shield   │  │  Wallet Connection  │ │
│  │  (Stealth)  │  │  (Scanner)  │  │  (ZK Pool)  │  │   (RainbowKit)      │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘ │
└─────────┼────────────────┼────────────────┼─────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SDK (@mantle-privacy/sdk)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Stealth Crypto │  │  Event Scanner  │  │      ZK Prover              │  │
│  │  - ECDH         │  │  - Scan events  │  │  - Generate proofs          │  │
│  │  - Key derivation│ │  - Match payments│ │  - Poseidon hashing         │  │
│  │  - Meta-address │  │  - Indexer client│ │  - Commitment generation    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SMART CONTRACTS (Solidity)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ ERC5564Announcer│  │   StealthPay    │  │      ShieldedPool           │  │
│  │ - Emit events   │  │ - Send stealth  │  │  - Deposit with commitment  │  │
│  │ - Store metadata│  │ - Native + ERC20│  │  - Withdraw with ZK proof   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                        │                    │
│                              ┌──────────────────┐  ┌───┴───────────────┐    │
│                              │   PoseidonT3     │  │  Groth16Verifier  │    │
│                              │ (ZK-friendly hash)│ │  (Proof verify)   │    │
│                              └──────────────────┘  └───────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                          │
          ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            INDEXER SERVICE                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Event Scanner  │  │  Merkle Tree    │  │      REST API               │  │
│  │  - Watch chain  │  │  - Build tree   │  │  - /api/merkle-path         │  │
│  │  - Index events │  │  - Poseidon hash│  │  - /api/deposits            │  │
│  │  - PostgreSQL   │  │  - Match contract│ │  - /api/announcements       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What Does Each Component Do?

### 1. Smart Contracts (`packages/contracts`)

| Contract | Purpose |
|----------|---------|
| **ERC5564Announcer** | Emits `Announcement` events with stealth address metadata. Follows ERC-5564 standard. |
| **StealthPay** | Main contract for stealth payments. Derives stealth address and sends MNT/tokens. |
| **ShieldedPool** | ZK mixing pool. Deposits create commitments; withdrawals require ZK proofs. |
| **PoseidonT3** | ZK-friendly hash function (cheaper in circuits than keccak256). |
| **Groth16Verifier** | Verifies ZK proofs on-chain. Auto-generated from circuit. |
| **MerkleTree** | Incremental Merkle tree for tracking deposits in ShieldedPool. |

### 2. SDK (`packages/sdk`)

The SDK is the **cryptographic engine** that powers all privacy features. It runs in the browser and handles:

#### Stealth Address Functions
```typescript
// Generate privacy keys for receiving
generateStealthKeys() → { spendingKey, viewingKey, metaAddress }

// Sender: derive one-time stealth address
deriveStealthAddress(metaAddress, ephemeralKey) → stealthAddress

// Recipient: check if a payment is for them
checkStealthAddress(announcement, viewingKey) → boolean

// Recipient: derive private key to claim funds
deriveStealthPrivateKey(announcement, spendingKey, viewingKey) → privateKey
```

#### ZK Proof Functions
```typescript
// Generate deposit note (secret + nullifier + commitment)
generateDepositNote(amount) → { secret, nullifier, commitment, nullifierHash }

// Compute Poseidon hash (matches on-chain)
computeCommitment(secret, nullifier, amount) → commitment

// Generate ZK proof for withdrawal (runs in browser, ~30-60 seconds)
generateWithdrawProof(input, wasmPath, zkeyPath) → proof

// Convert proof to contract calldata format
proofToCalldata(proof) → { proof: uint256[8], publicSignals }
```

#### Indexer Client
```typescript
// Create client to fetch data from indexer
createIndexerClient({ apiUrl }) → client

// Get Merkle path for a commitment (needed for ZK proof)
client.getMerklePath(commitment) → { pathElements, pathIndices, root }

// Scan for stealth payments
client.getAnnouncements({ fromBlock }) → announcements[]
```

### 3. Indexer Service (`packages/indexer`)

The indexer is a **backend service** that:

1. **Watches the blockchain** for Deposit and Announcement events
2. **Stores events** in PostgreSQL for fast querying
3. **Builds the Merkle tree** matching the on-chain state exactly
4. **Provides REST API** for the frontend to fetch:
   - Merkle paths (required for ZK proofs)
   - Deposit history
   - Announcement events

**Why is this needed?**
- ZK proofs require the Merkle path (20 sibling hashes)
- Computing this on-chain would cost millions of gas
- The indexer computes it off-chain for free
- Without the indexer, withdrawals would be impossible

### 4. Frontend (`packages/frontend`)

Next.js application with three main pages:

| Page | Function |
|------|----------|
| `/send` | Send private payments using stealth addresses |
| `/receive` | Scan blockchain for incoming stealth payments |
| `/shield` | Deposit/withdraw from ZK shielded pool |

---

## Privacy Flow Diagrams

### Stealth Address Payment Flow

```
SENDER (Alice)                                    RECIPIENT (Bob)
    │                                                   │
    │  1. Get Bob's meta-address                        │
    │     (st:eth:0x<spendPubKey><viewPubKey>)          │
    │◄──────────────────────────────────────────────────│
    │                                                   │
    │  2. Generate ephemeral keypair                    │
    │     ephPriv = random()                            │
    │     ephPub = ephPriv * G                          │
    │                                                   │
    │  3. Compute shared secret (ECDH)                  │
    │     shared = hash(ephPriv * viewPubKey)           │
    │                                                   │
    │  4. Derive stealth address                        │
    │     stealthPub = spendPubKey + shared * G         │
    │     stealthAddr = address(stealthPub)             │
    │                                                   │
    │  5. Send MNT to stealthAddr                       │
    │     + Emit Announcement(stealthAddr, ephPub)      │
    │─────────────────────────────────────────────────► │
    │                                           BLOCKCHAIN
    │                                                   │
    │                                    6. Bob scans Announcements
    │                                       For each event:
    │                                       - shared = hash(viewPriv * ephPub)
    │                                       - expectedAddr = derive(shared)
    │                                       - if (expectedAddr == stealthAddr)
    │                                           → This payment is for me!
    │                                                   │
    │                                    7. Bob derives private key
    │                                       stealthPriv = spendPriv + shared
    │                                                   │
    │                                    8. Bob withdraws using stealthPriv
    │                                                   ▼
```

**Privacy achieved**: On-chain, there's no link between Alice and Bob. The stealth address is a one-time address that only Bob can derive.

### ZK Shielded Pool Flow

```
DEPOSIT PHASE                                    WITHDRAW PHASE
    │                                                   │
    │  1. Generate deposit note                         │
    │     secret = random()                             │
    │     nullifier = random()                          │
    │     commitment = Poseidon(secret, nullifier, amt) │
    │                                                   │
    │  2. Send MNT + commitment to ShieldedPool         │
    │     deposit(commitment, amount) payable           │
    │─────────────────────────────────────────────────► │
    │                                           BLOCKCHAIN
    │                                    (commitment added to Merkle tree)
    │                                                   │
    │  3. SAVE THE NOTE! (secret, nullifier, etc.)      │
    │     Without it, funds are LOST forever            │
    │                                                   │
    │                                                   │
    │                                    4. Get Merkle path from indexer
    │                                       path = indexer.getMerklePath(commitment)
    │                                                   │
    │                                    5. Generate ZK proof (browser)
    │                                       proof = generateWithdrawProof({
    │                                         secret, nullifier,
    │                                         pathElements, pathIndices,
    │                                         root, nullifierHash,
    │                                         recipient, amount
    │                                       })
    │                                                   │
    │                                    6. Submit withdrawal
    │                                       withdraw(proof, root, nullifierHash,
    │                                                recipient, amount)
    │                                                   │
    │                                    7. Contract verifies:
    │                                       - ZK proof is valid
    │                                       - nullifierHash not used before
    │                                       - root is a known historical root
    │                                                   │
    │                                    8. MNT sent to recipient
    │                                                   ▼
```

**Privacy achieved**: The ZK proof proves "I know a valid deposit" without revealing WHICH deposit. Amount is hidden because deposits use fixed denominations.

---

## Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Blockchain** | Mantle Sepolia | Low gas, EVM compatible, fast finality |
| **Contracts** | Solidity + Foundry | Industry standard, great testing |
| **ZK Circuits** | Circom + Groth16 | Battle-tested (Tornado Cash), small proofs |
| **ZK Hash** | Poseidon | ~8x cheaper in ZK circuits than keccak256 |
| **SDK** | TypeScript | Browser compatible, type safety |
| **Crypto** | @noble/curves | Audited, pure JS, no WASM needed |
| **Frontend** | Next.js 14 | React Server Components, great DX |
| **Wallet** | RainbowKit + wagmi | Best UX for wallet connection |
| **Indexer** | Express + Prisma + PostgreSQL | Reliable, easy to deploy |

---

## Security Considerations

1. **Key Storage**: Private keys are stored in browser localStorage (encrypted). For production, consider hardware wallet integration.

2. **Deposit Notes**: Users MUST save their deposit notes. Lost note = lost funds forever.

3. **Nullifier Tracking**: Each deposit can only be withdrawn once. The nullifierHash prevents double-spending.

4. **Merkle Root History**: Contract stores last 100 roots. Old roots are still valid for withdrawal.

5. **ZK Proof Verification**: All proofs are verified on-chain by the Groth16Verifier contract.

---

## Contract Addresses (Mantle Sepolia)

| Contract | Address |
|----------|---------|
| ERC5564Announcer | `0x4e59AfB497B33D3210A498fE12EB2D5ce787530c` |
| StealthPay | `0x091870e699a7ca8C4bB16F829fb4fD0aB549CC5C` |
| PoseidonT3 | `0xc08E75955D081bE4Bc43a67f7F029115767B7155` |
| ShieldedPool | `0xc6277cF453bE422e6BC04D4ff171840069c845f2` |

---

## Future Improvements

1. **Relayer Network**: Gasless withdrawals to prevent gas payment linkage
2. **Multi-asset Support**: ERC-20 tokens in shielded pool
3. **Mobile App**: React Native with secure enclave key storage
4. **Hardware Wallet**: Ledger/Trezor integration for key management
5. **Compliance Tools**: Optional view key disclosure for audits
