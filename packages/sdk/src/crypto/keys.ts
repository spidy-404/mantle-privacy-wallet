/**
 * Key generation and management for stealth addresses
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { randomBytes } from '@noble/hashes/utils';
import { hexlify } from 'ethers';
import type { Keypair, StealthMetaAddress, KeyGenerationOptions } from '../types';
import { toHex, ensureHexPrefix, removeHexPrefix } from '../utils/encoding';
import { validatePublicKey } from '../utils/validation';

/**
 * Generate a random keypair for viewing or spending
 * @param options Optional configuration
 * @returns Keypair with private and public keys
 */
export function generateKeypair(options?: KeyGenerationOptions): Keypair {
    // Generate private key (32 bytes)
    const privateKeyBytes = options?.entropy || randomBytes(32);
    const privateKey = toHex(privateKeyBytes);

    // Derive public key from private key
    const publicKeyPoint = secp256k1.ProjectivePoint.fromPrivateKey(privateKeyBytes);

    // Uncompressed public key (65 bytes: 0x04 + x + y)
    const publicKeyBytes = publicKeyPoint.toRawBytes(false);
    const publicKey = toHex(publicKeyBytes);

    // Compressed public key (33 bytes: 0x02/0x03 + x)
    const compressedPublicKeyBytes = publicKeyPoint.toRawBytes(true);
    const compressedPublicKey = toHex(compressedPublicKeyBytes);

    return {
        privateKey,
        publicKey,
        compressedPublicKey,
    };
}

/**
 * Generate a viewing keypair for scanning payments
 * Viewing keys are used to derive shared secrets and identify payments
 */
export function generateViewingKeypair(options?: KeyGenerationOptions): Keypair {
    return generateKeypair(options);
}

/**
 * Generate a spending keypair for controlling funds
 * Spending keys are used to derive stealth private keys and withdraw funds
 */
export function generateSpendingKeypair(options?: KeyGenerationOptions): Keypair {
    return generateKeypair(options);
}

/**
 * Derive public key from private key
 * @param privateKey Private key as hex string
 * @returns Keypair with derived public keys
 */
export function derivePublicKey(privateKey: string): Keypair {
    const privateKeyBytes = new Uint8Array(
        Buffer.from(removeHexPrefix(privateKey), 'hex')
    );

    const publicKeyPoint = secp256k1.ProjectivePoint.fromPrivateKey(privateKeyBytes);

    const publicKeyBytes = publicKeyPoint.toRawBytes(false);
    const publicKey = toHex(publicKeyBytes);

    const compressedPublicKeyBytes = publicKeyPoint.toRawBytes(true);
    const compressedPublicKey = toHex(compressedPublicKeyBytes);

    return {
        privateKey: ensureHexPrefix(privateKey),
        publicKey,
        compressedPublicKey,
    };
}

/**
 * Create a stealth meta-address from viewing and spending public keys
 * This is what recipients publish for others to send them stealth payments
 *
 * @param viewingPublicKey Public key for scanning (uncompressed or compressed)
 * @param spendingPublicKey Public key for spending (uncompressed or compressed)
 * @returns StealthMetaAddress object with encoded string
 */
export function generateStealthMetaAddress(
    viewingPublicKey: string,
    spendingPublicKey: string
): StealthMetaAddress {
    validatePublicKey(viewingPublicKey);
    validatePublicKey(spendingPublicKey);

    // Normalize to compressed format for compact encoding
    const viewPubCompressed = compressPublicKey(viewingPublicKey);
    const spendPubCompressed = compressPublicKey(spendingPublicKey);

    // Encode as: viewPub:spendPub
    const encoded = `${viewPubCompressed}:${spendPubCompressed}`;

    return {
        viewingPublicKey: viewPubCompressed,
        spendingPublicKey: spendPubCompressed,
        encoded,
    };
}

/**
 * Parse an encoded stealth meta-address string
 * @param encoded Encoded meta-address (viewPub:spendPub)
 * @returns StealthMetaAddress object
 */
export function parseStealthMetaAddress(encoded: string): StealthMetaAddress {
    const parts = encoded.split(':');
    if (parts.length !== 2) {
        throw new Error('Invalid stealth meta-address format');
    }

    const [viewingPublicKey, spendingPublicKey] = parts;

    validatePublicKey(viewingPublicKey);
    validatePublicKey(spendingPublicKey);

    return {
        viewingPublicKey,
        spendingPublicKey,
        encoded,
    };
}

/**
 * Compress a public key to 33 bytes
 * @param publicKey Uncompressed (65 bytes) or compressed (33 bytes) public key
 * @returns Compressed public key (33 bytes)
 */
export function compressPublicKey(publicKey: string): string {
    const cleanHex = removeHexPrefix(publicKey);
    const bytes = new Uint8Array(Buffer.from(cleanHex, 'hex'));

    // Already compressed
    if (bytes.length === 33) {
        return ensureHexPrefix(publicKey);
    }

    // Decompress and recompress
    if (bytes.length === 65) {
        const point = secp256k1.ProjectivePoint.fromHex(bytes);
        const compressed = point.toRawBytes(true);
        return toHex(compressed);
    }

    throw new Error(`Invalid public key length: ${bytes.length}`);
}

/**
 * Uncompress a public key to 65 bytes
 * @param publicKey Compressed (33 bytes) or uncompressed (65 bytes) public key
 * @returns Uncompressed public key (65 bytes)
 */
export function uncompressPublicKey(publicKey: string): string {
    const cleanHex = removeHexPrefix(publicKey);
    const bytes = new Uint8Array(Buffer.from(cleanHex, 'hex'));

    // Already uncompressed
    if (bytes.length === 65) {
        return ensureHexPrefix(publicKey);
    }

    // Decompress
    if (bytes.length === 33) {
        const point = secp256k1.ProjectivePoint.fromHex(bytes);
        const uncompressed = point.toRawBytes(false);
        return toHex(uncompressed);
    }

    throw new Error(`Invalid public key length: ${bytes.length}`);
}

/**
 * Serialize keypair to JSON for storage
 */
export function serializeKeypair(keypair: Keypair): string {
    return JSON.stringify(keypair);
}

/**
 * Deserialize keypair from JSON
 */
export function deserializeKeypair(json: string): Keypair {
    const parsed = JSON.parse(json);
    validatePublicKey(parsed.publicKey);
    return parsed as Keypair;
}
