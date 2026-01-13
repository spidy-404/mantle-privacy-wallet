/**
 * Mantle Privacy Wallet SDK
 * TypeScript SDK for ERC-5564 stealth payments on Mantle Network
 */

// Crypto utilities
export {
    generateKeypair,
    generateViewingKeypair,
    generateSpendingKeypair,
    derivePublicKey,
    generateStealthMetaAddress,
    parseStealthMetaAddress,
    compressPublicKey,
    uncompressPublicKey,
    serializeKeypair,
    deserializeKeypair,
} from './crypto/keys';

export {
    computeSharedSecret,
    computeSharedSecretSender,
    computeSharedSecretRecipient,
    generateViewTag,
} from './crypto/ecdh';

export {
    generateStealthAddress,
    computeStealthPrivateKey,
    checkStealthAddress,
    privateKeyToAddress,
} from './crypto/stealth';

// Types
export type {
    Keypair,
    StealthMetaAddress,
    StealthAddressInfo,
    StealthPayment,
    ScanConfig,
    AnnouncementEvent,
    KeyGenerationOptions,
} from './types';

// Utilities
export {
    toHex,
    fromHex,
    ensureHexPrefix,
    removeHexPrefix,
    padHex,
    concatHex,
    hexEqual,
} from './utils/encoding';

export {
    validateAddress,
    validateHexString,
    validatePrivateKey,
    validatePublicKey,
    validateStealthMetaAddress,
} from './utils/validation';

// ZK Prover
export {
    generateWithdrawProof,
    proofToCalldata,
    verifyProof,
    computeCommitment,
    computeNullifierHash,
    randomFieldElement,
    generateDepositNote,
} from './zk/prover';

export type { WithdrawInput, Proof, ProofCalldata } from './zk/prover';

// Indexer Client
export { IndexerClient, createIndexerClient } from './indexer/client';

export type {
    IndexerConfig,
    AnnouncementData,
    DepositData,
    MerklePathData,
    IndexerStatus,
} from './indexer/client';
