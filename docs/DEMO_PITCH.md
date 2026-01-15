# Mantle Privacy Wallet - Demo Script & Pitch

## Elevator Pitch (30 seconds)

> "Mantle Privacy Wallet brings Ethereum-grade privacy to Mantle Network. We combine **stealth addresses** to hide who you're paying with **zero-knowledge proofs** to hide how much you're sending. Think of it as Venmo meets Swiss banking - fast, cheap transactions on Mantle with complete financial privacy. No one can see your balance, your transaction history, or who you're transacting with."

---

## The Problem We Solve (1 minute)

**Current State of Blockchain Privacy:**
- Every transaction is PUBLIC and PERMANENT
- Your wallet address is like a bank account number everyone can see
- Anyone can track your entire financial history
- Employers, advertisers, hackers can see your salary, spending habits, net worth

**Real-World Consequences:**
- A freelancer paid in crypto has their income visible to everyone
- Businesses can't pay suppliers without competitors seeing their costs
- High-value wallet holders become targets for hacking and physical attacks
- No financial privacy = no financial freedom

**Our Solution:**
Two-layer privacy system:
1. **Stealth Addresses**: Hide recipient identity (who you're paying)
2. **ZK Shielded Pool**: Hide transaction amounts (how much you're sending)

---

## Demo Flow (10-15 minutes)

### Setup Before Demo
1. Have two browser windows open (simulating Alice and Bob)
2. Both connected to Mantle Sepolia testnet
3. Both wallets funded with test MNT
4. Have the indexer running locally or use deployed version

---

### DEMO PART 1: Stealth Address Payments (5 minutes)

**Scenario**: Alice wants to pay Bob 0.1 MNT privately

#### Step 1: Bob Generates Privacy Keys
*[Browser 2 - Bob]*

1. Go to **Receive** page
2. Click **"Generate New Keys"**
3. Show the generated keys:
   - Spending Key (private - keeps secret)
   - Viewing Key (private - keeps secret)
   - Meta-Address (public - shares with senders)

**Say**:
> "Bob generates his privacy keys. The meta-address is like a public email - he can share it anywhere. But unlike a regular wallet address, every payment to this meta-address goes to a DIFFERENT one-time address."

#### Step 2: Bob Shares Meta-Address
*[Copy meta-address]*

**Say**:
> "Bob shares his meta-address with Alice. This could be on his website, Twitter bio, or sent directly. It starts with 'st:eth:' to identify it as a stealth meta-address."

#### Step 3: Alice Sends Private Payment
*[Browser 1 - Alice]*

1. Go to **Send** page
2. Paste Bob's meta-address
3. Enter amount: **0.1 MNT**
4. Click **"Send Private Payment"**
5. Show the transaction confirming

**Say**:
> "Alice sends 0.1 MNT to Bob's meta-address. Behind the scenes, the SDK derives a one-time stealth address using elliptic curve cryptography. This address has NEVER existed before and will NEVER be used again."

#### Step 4: Show On-Chain Privacy
*[Open Mantle Explorer]*

**Say**:
> "If we look at the blockchain, we see Alice sent funds to address 0xABC123... But this address has NO connection to Bob. There's no way to know Bob received this payment just by looking at the blockchain."

#### Step 5: Bob Scans for Payments
*[Browser 2 - Bob]*

1. Go to **Receive** page
2. Keys should be loaded
3. Click **"Scan for Payments"**
4. Show the incoming payment detected

**Say**:
> "Bob scans the blockchain using his viewing key. The SDK checks each announcement event and mathematically determines if it's for Bob. Only Bob can identify his payments - no one else can."

#### Step 6: Bob Withdraws
1. Click **"Withdraw"** on the detected payment
2. Show transaction completing
3. Funds arrive in Bob's main wallet

**Say**:
> "Bob can withdraw to any address he chooses. The link between Alice and Bob exists only in Bob's local browser - never on the blockchain."

---

### DEMO PART 2: ZK Shielded Pool (7 minutes)

**Scenario**: Demonstrate amount privacy with zero-knowledge proofs

#### Step 1: Explain the Concept
**Say**:
> "Stealth addresses hide WHO you pay. But the AMOUNT is still visible. For complete privacy, we need to hide amounts too. That's what the Shielded Pool does using zero-knowledge proofs."

#### Step 2: Make a Deposit
*[Browser 1]*

1. Go to **Shield** page
2. Select amount: **0.1 MNT**
3. Click **"Deposit to Pool"**
4. Wait for transaction
5. **IMPORTANT**: Show and download the deposit note

**Say**:
> "When you deposit, you're not just sending MNT to a contract. You're creating a cryptographic commitment - a hash of a secret only you know. This secret is your 'deposit note' - you MUST save it to withdraw later."

*[Show the deposit note JSON]*

**Say**:
> "This note contains your secret and nullifier. Think of it like a claim ticket at a coat check. Without this ticket, you cannot prove the deposit is yours."

#### Step 3: Explain What Happened On-Chain
**Say**:
> "On-chain, the contract only stored a commitment hash. It has NO idea who made this deposit or what the secret is. The commitment is added to a Merkle tree with all other deposits."

#### Step 4: Make a Withdrawal
1. Paste the deposit note into the withdraw field
2. Enter recipient address (can be ANY address)
3. Click **"Withdraw from Pool"**

**Say**:
> "Now for the magic. To withdraw, we generate a zero-knowledge proof. This proof says: 'I know a valid deposit in this pool' WITHOUT revealing WHICH deposit."

*[Show the status messages as proof generates]*

**Say**:
> "The browser is now generating a ZK proof. This involves:
> 1. Fetching the Merkle path from our indexer (the 20 sibling hashes)
> 2. Running the ZK circuit with our secret inputs
> 3. Creating a proof that takes 30-60 seconds
>
> This is real cryptography happening in your browser - no trusted server required."

#### Step 5: Show Successful Withdrawal
*[Wait for transaction to complete]*

**Say**:
> "The withdrawal succeeded! Let's look at what the blockchain sees:
> - A proof was verified (just math, no secrets revealed)
> - A nullifier hash was recorded (prevents double-spending)
> - MNT was sent to the recipient
>
> But the blockchain has NO idea which deposit was withdrawn. Could be the first deposit ever, could be the most recent. Complete amount privacy."

#### Step 6: Try to Double-Spend (Optional)
1. Try to withdraw with the same note again
2. Show the "nullifier already used" error

**Say**:
> "Each deposit can only be withdrawn once. The nullifier hash is unique to each deposit and gets recorded on withdrawal. Trying to use the same note twice fails immediately."

---

### DEMO PART 3: Technical Deep Dive (Optional, 3 minutes)

*[If judges want technical details]*

1. **Show the SDK code**: How stealth addresses are derived using ECDH
2. **Show the circuit**: The Circom code that defines what the ZK proof verifies
3. **Show the indexer**: How we track deposits and build Merkle trees
4. **Show gas costs**: Stealth payment ~100k gas, ZK withdrawal ~300k gas

---

## Key Talking Points

### Why Mantle?
- **Low gas fees**: ZK proof verification costs ~300k gas, affordable on Mantle
- **Fast finality**: Privacy transactions confirm in seconds
- **EVM compatible**: We use standard Solidity, easy to audit and extend
- **Growing ecosystem**: Privacy is essential infrastructure for DeFi

### Why This Architecture?
- **Stealth addresses**: Based on ERC-5564 standard, battle-tested design
- **Groth16 proofs**: Same tech as Tornado Cash, smallest proof size, fastest verification
- **Poseidon hash**: 8x cheaper in ZK circuits than keccak256
- **Browser-based proving**: No trusted server, true decentralization

### Security Highlights
- **No trusted setup for stealth**: Pure elliptic curve math
- **Standard trusted setup for ZK**: Uses Hermez ceremony (Powers of Tau)
- **Open source**: All code available for audit
- **Non-custodial**: Users control their keys and funds at all times

---

## Anticipated Questions & Answers

**Q: Is this legal?**
> A: Yes. Privacy is a fundamental right. Our tool is like encrypted messaging - the technology is legal, though illegal uses are not. We're building compliance features like optional view key disclosure for audits.

**Q: How is this different from Tornado Cash?**
> A: We add stealth addresses on top. Tornado only hides amounts among same-denomination deposits. We also hide the recipient. Plus, we're building on Mantle with better UX.

**Q: What if I lose my deposit note?**
> A: Funds are lost forever. This is the tradeoff for true privacy - no one, not even us, can recover your funds. We strongly emphasize backing up notes.

**Q: How fast is proof generation?**
> A: 30-60 seconds in browser. We're optimizing with WebAssembly and Web Workers. Future versions could use mobile secure enclaves for faster proving.

**Q: What's the trusted setup?**
> A: We use the Hermez Powers of Tau ceremony with 100+ participants. As long as ONE participant was honest and deleted their toxic waste, the setup is secure.

**Q: Can governments track this?**
> A: By design, no. The math makes it impossible without the user's private keys. This is the same privacy guarantee as encrypted messages.

---

## Closing Statement

> "Financial privacy isn't about hiding illegal activity - it's about protecting your personal information in an increasingly surveilled world. Mantle Privacy Wallet brings battle-tested privacy technology to Mantle's fast, affordable network. We believe privacy is a feature, not a bug, and we're building the infrastructure to make it accessible to everyone."

---

## Demo Checklist

Before demo:
- [ ] Two browsers with different wallets
- [ ] Both connected to Mantle Sepolia
- [ ] Both wallets have test MNT (get from faucet)
- [ ] Indexer running (local or deployed)
- [ ] Frontend running locally or deployed
- [ ] Have Mantle Explorer open in a tab
- [ ] Test the full flow once before presenting

During demo:
- [ ] Speak slowly and explain each step
- [ ] Show both blockchain view and UI view
- [ ] Emphasize what's private vs what's public
- [ ] Download and show the deposit note
- [ ] Be ready to explain technical details if asked
