# Deployment Documentation

## Mantle Sepolia Testnet - Phase 1 Deployment

**Date**: January 13, 2026
**Network**: Mantle Sepolia Testnet
**Chain ID**: 5003

### Deployed Contracts

| Contract | Address | Explorer Link |
|----------|---------|---------------|
| ERC5564Announcer | `0x0B7BeA2BD729faD217127610e950F316559C16b6` | [View](https://sepolia.mantlescan.xyz/address/0x0B7BeA2BD729faD217127610e950F316559C16b6) |
| StealthPay | `0x357dd5dc38A3cA13840250FC67D523A62720902f` | [View](https://sepolia.mantlescan.xyz/address/0x357dd5dc38A3cA13840250FC67D523A62720902f) |

### Network Configuration

```javascript
{
  chainId: 5003,
  name: "Mantle Sepolia Testnet",
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  explorerUrl: "https://sepolia.mantlescan.xyz",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18
  }
}
```

### Contract Overview

#### ERC5564Announcer

**Purpose**: Emits standardized announcement events for stealth payments following ERC-5564.

**Key Functions**:
- `announce(uint256 schemeId, address stealthAddress, bytes ephemeralPubKey, bytes metadata)`

**Events**:
- `Announcement(uint256 indexed schemeId, address indexed stealthAddress, address indexed caller, bytes ephemeralPubKey, bytes metadata)`

**Scheme ID**: 1 (secp256k1)

#### StealthPay

**Purpose**: Helper contract for sending native MNT and ERC-20 tokens to stealth addresses with automatic announcements.

**Key Functions**:
- `sendEtherStealth(uint256 schemeId, address stealthAddress, bytes ephemeralPubKey, bytes metadata) payable`
- `sendTokenStealth(uint256 schemeId, address token, uint256 amount, address stealthAddress, bytes ephemeralPubKey, bytes metadata)`

**Events**:
- `StealthPayment(address indexed stealthAddress, address indexed asset, uint256 amount, address indexed caller)`

**Security Features**:
- ReentrancyGuard protection
- SafeERC20 for token transfers
- Zero amount checks
- Zero address validation

### SDK Integration

To use these contracts with the SDK:

```typescript
import { ethers } from 'ethers';
import {
  generateViewingKeypair,
  generateSpendingKeypair,
  generateStealthMetaAddress,
  generateStealthAddress,
} from '@mantle-privacy/sdk';

// Connect to Mantle Sepolia
const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.mantle.xyz');
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract addresses
const STEALTH_PAY_ADDRESS = '0x357dd5dc38A3cA13840250FC67D523A62720902f';

// Recipient generates keys and meta-address
const viewingKeypair = generateViewingKeypair();
const spendingKeypair = generateSpendingKeypair();
const metaAddress = generateStealthMetaAddress(
  viewingKeypair.publicKey,
  spendingKeypair.publicKey
);

console.log('Stealth Meta-Address:', metaAddress.encoded);

// Sender generates stealth address
const stealthInfo = generateStealthAddress(metaAddress);

// Send payment via StealthPay contract
const stealthPayContract = new ethers.Contract(
  STEALTH_PAY_ADDRESS,
  [
    'function sendEtherStealth(uint256 schemeId, address stealthAddress, bytes calldata ephemeralPubKey, bytes calldata metadata) external payable'
  ],
  signer
);

const tx = await stealthPayContract.sendEtherStealth(
  1, // schemeId (secp256k1)
  stealthInfo.stealthAddress,
  stealthInfo.ephemeralPublicKey,
  stealthInfo.metadata,
  { value: ethers.parseEther('0.1') } // Send 0.1 MNT
);

await tx.wait();
console.log('Payment sent to stealth address:', stealthInfo.stealthAddress);
```

### Testing the Deployment

#### Send a Test Payment

1. Get some testnet MNT from [Mantle Sepolia Faucet](https://faucet.mantle.xyz)

2. Generate recipient keys:
```bash
cd packages/sdk
node -e "
const sdk = require('./dist/index.js');
const viewing = sdk.generateViewingKeypair();
const spending = sdk.generateSpendingKeypair();
const meta = sdk.generateStealthMetaAddress(viewing.publicKey, spending.publicKey);
console.log('Meta-address:', meta.encoded);
console.log('Viewing private key:', viewing.privateKey);
console.log('Spending private key:', spending.privateKey);
"
```

3. Send a payment using the StealthPay contract on Mantle Sepolia explorer

4. Scan for announcements and derive stealth private key

#### Verify on Explorer

- View transactions: https://sepolia.mantlescan.xyz/address/0x357dd5dc38A3cA13840250FC67D523A62720902f
- Check Announcement events: https://sepolia.mantlescan.xyz/address/0x0B7BeA2BD729faD217127610e950F316559C16b6#events

### Gas Costs (Estimates)

| Operation | Gas Used | Cost (at 0.02 gwei) |
|-----------|----------|---------------------|
| ERC5564Announcer.announce() | ~21,000 | ~0.00042 MNT |
| StealthPay.sendEtherStealth() | ~50,000 | ~0.001 MNT |
| StealthPay.sendTokenStealth() | ~70,000 | ~0.0014 MNT |

### Next Steps

1. **Phase 2**: Build frontend for easier interaction
2. **Phase 3**: Implement ZK shielded pool for amount privacy
3. **Phase 4**: Deploy indexer service for faster scanning
4. **Phase 5**: Security audit before mainnet

### Support

For issues or questions:
- GitHub Issues: https://github.com/spidy-404/mantle-privacy-wallet/issues
- Check explorer for transaction status
- Verify contract addresses above

### Important Notes

⚠️ **This is a testnet deployment for testing purposes only**
- Do not use mainnet private keys
- Testnet MNT has no value
- Contracts have not been audited
- Use at your own risk

✅ **What works**:
- Generate stealth addresses
- Send MNT to stealth addresses
- Send ERC-20 tokens to stealth addresses
- Scan announcements
- Derive stealth private keys
- Withdraw from stealth addresses

🚧 **Coming soon**:
- Web UI for easy interaction
- Event indexer for faster scanning
- ZK proofs for amount hiding
- Production deployment to Mantle mainnet
