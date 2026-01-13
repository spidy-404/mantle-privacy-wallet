/**
 * Type definitions for Mantle Privacy Wallet SDK
 */

/**
 * Keypair for elliptic curve cryptography
 */
export interface Keypair {
    /** Private key as hex string with 0x prefix */
    privateKey: string;
    /** Public key as hex string with 0x prefix (uncompressed, 65 bytes) */
    publicKey: string;
    /** Compressed public key as hex string with 0x prefix (33 bytes) */
    compressedPublicKey: string;
}

/**
 * Stealth meta-address containing recipient's public keys
 */
export interface StealthMetaAddress {
    /** Viewing public key (for scanning payments) */
    viewingPublicKey: string;
    /** Spending public key (for controlling funds) */
    spendingPublicKey: string;
    /** Encoded string representation (view_pub:spend_pub) */
    encoded: string;
}

/**
 * Result of generating a stealth address
 */
export interface StealthAddressInfo {
    /** The derived stealth address (recipient receives funds here) */
    stealthAddress: string;
    /** Ephemeral public key (published in announcement) */
    ephemeralPublicKey: string;
    /** Metadata (can contain encrypted shared secret or other data) */
    metadata: string;
    /** View tag for faster scanning (optional optimization) */
    viewTag?: string;
}

/**
 * Information about a discovered stealth payment
 */
export interface StealthPayment {
    /** The stealth address that received the payment */
    stealthAddress: string;
    /** The derived stealth private key to control funds */
    stealthPrivateKey: string;
    /** Transaction hash of the announcement */
    txHash: string;
    /** Block number where announcement was made */
    blockNumber: number;
    /** Scheme ID used (1 = secp256k1) */
    schemeId: number;
    /** Ephemeral public key from announcement */
    ephemeralPublicKey: string;
    /** Metadata from announcement */
    metadata: string;
}

/**
 * Configuration for scanning announcements
 */
export interface ScanConfig {
    /** Provider or RPC URL */
    provider: any; // ethers.Provider
    /** ERC5564Announcer contract address */
    announcerAddress: string;
    /** Viewing private key for deriving shared secrets */
    viewingPrivateKey: string;
    /** Spending private key for deriving stealth private keys */
    spendingPrivateKey: string;
    /** Starting block number */
    fromBlock: number | string;
    /** Ending block number */
    toBlock: number | string;
    /** Scheme ID to filter (default: 1 for secp256k1) */
    schemeId?: number;
}

/**
 * Announcement event data from ERC5564Announcer
 */
export interface AnnouncementEvent {
    /** Scheme ID (1 = secp256k1) */
    schemeId: bigint;
    /** Stealth address that received payment */
    stealthAddress: string;
    /** Address that called announce() */
    caller: string;
    /** Ephemeral public key for shared secret derivation */
    ephemeralPublicKey: string;
    /** Additional metadata */
    metadata: string;
    /** Transaction hash */
    transactionHash: string;
    /** Block number */
    blockNumber: number;
    /** Log index in block */
    logIndex: number;
}

/**
 * Options for key generation
 */
export interface KeyGenerationOptions {
    /** Optional entropy (32 bytes) for deterministic generation */
    entropy?: Uint8Array;
}
