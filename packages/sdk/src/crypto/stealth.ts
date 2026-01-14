/**
 * Stealth address generation and derivation
 * Implements ERC-5564 stealth address protocol
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import { getAddress } from 'ethers';
import type { StealthMetaAddress, StealthAddressInfo, Keypair } from '../types';
import { generateKeypair, parseStealthMetaAddress, uncompressPublicKey } from './keys';
import { computeSharedSecretSender, computeSharedSecretRecipient, generateViewTag } from './ecdh';
import { toHex, fromHex, removeHexPrefix, ensureHexPrefix } from '../utils/encoding';
import { validateAddress } from '../utils/validation';

/**
 * Generate a stealth address for a recipient (SENDER SIDE)
 *
 * Steps:
 * 1. Generate ephemeral keypair
 * 2. Compute shared secret: ECDH(ephemeralPriv, recipientViewPub)
 * 3. Derive stealth public key: stealthPub = recipientSpendPub + (sharedSecret * G)
 * 4. Derive stealth address from stealth public key
 *
 * @param recipientMetaAddress Recipient's stealth meta-address
 * @param schemeId Stealth address scheme (1 = secp256k1)
 * @returns Stealth address info with ephemeral public key and metadata
 */
export function generateStealthAddress(
    recipientMetaAddress: StealthMetaAddress | string,
    schemeId: number = 1
): StealthAddressInfo {
    // Parse meta-address if string
    const metaAddress = typeof recipientMetaAddress === 'string'
        ? parseStealthMetaAddress(recipientMetaAddress)
        : recipientMetaAddress;

    if (schemeId !== 1) {
        throw new Error('Only scheme ID 1 (secp256k1) is currently supported');
    }

    // 1. Generate ephemeral keypair
    const ephemeralKeypair = generateKeypair();

    // 2. Compute shared secret
    const sharedSecret = computeSharedSecretSender(
        ephemeralKeypair.privateKey,
        metaAddress.viewingPublicKey
    );

    // 3. Derive stealth public key
    const stealthPublicKey = deriveStealthPublicKey(
        metaAddress.spendingPublicKey,
        sharedSecret
    );

    // 4. Derive Ethereum address from stealth public key
    const stealthAddress = publicKeyToAddress(stealthPublicKey);

    // 5. Generate view tag for faster scanning (optional)
    const viewTag = generateViewTag(sharedSecret);

    // 6. Create metadata (for now, just empty - can include view tag or encrypted data)
    const metadata = '0x';

    return {
        stealthAddress,
        ephemeralPublicKey: ephemeralKeypair.compressedPublicKey,
        metadata,
        viewTag,
    };
}

/**
 * Compute the stealth private key for a payment (RECIPIENT SIDE)
 *
 * Steps:
 * 1. Compute shared secret: ECDH(viewingPriv, ephemeralPub)
 * 2. Derive stealth private key: stealthPriv = spendingPriv + sharedSecret (mod n)
 * 3. Derive stealth address and verify it matches
 *
 * @param viewingPrivateKey Recipient's viewing private key
 * @param spendingPrivateKey Recipient's spending private key
 * @param ephemeralPublicKey Sender's ephemeral public key from announcement
 * @returns Stealth private key if payment is for this recipient, null otherwise
 */
export function computeStealthPrivateKey(
    viewingPrivateKey: string,
    spendingPrivateKey: string,
    ephemeralPublicKey: string
): string {
    // 1. Compute shared secret
    const sharedSecret = computeSharedSecretRecipient(
        viewingPrivateKey,
        ephemeralPublicKey
    );

    // 2. Derive stealth private key: stealthPriv = spendingPriv + sharedSecret (mod n)
    const spendingPrivBigInt = BigInt(ensureHexPrefix(spendingPrivateKey));
    const sharedSecretBigInt = BigInt(ensureHexPrefix(sharedSecret));
    const curve = secp256k1.CURVE;

    // Add mod n (curve order)
    const stealthPrivBigInt = (spendingPrivBigInt + sharedSecretBigInt) % curve.n;

    // Convert to hex (32 bytes, padded)
    const stealthPrivHex = stealthPrivBigInt.toString(16).padStart(64, '0');

    return ensureHexPrefix(stealthPrivHex);
}

/**
 * Check if a stealth address matches the derived stealth private key
 * @param stealthPrivateKey Derived stealth private key
 * @param expectedStealthAddress Expected stealth address from announcement
 * @returns True if address matches
 */
export function checkStealthAddress(
    stealthPrivateKey: string,
    expectedStealthAddress: string
): boolean {
    validateAddress(expectedStealthAddress);

    // Derive public key from stealth private key
    const privateKeyBytes = fromHex(stealthPrivateKey);
    const publicKeyPoint = secp256k1.ProjectivePoint.fromPrivateKey(privateKeyBytes);
    const publicKeyBytes = publicKeyPoint.toRawBytes(false);
    const stealthPublicKey = toHex(publicKeyBytes);

    // Derive address from public key
    const derivedAddress = publicKeyToAddress(stealthPublicKey);

    // Compare addresses (case-insensitive)
    return derivedAddress.toLowerCase() === expectedStealthAddress.toLowerCase();
}

/**
 * Derive stealth public key from spending public key and shared secret
 * stealthPub = spendPub + (sharedSecret * G)
 *
 * @param spendingPublicKey Recipient's spending public key
 * @param sharedSecret Shared secret from ECDH
 * @returns Stealth public key (uncompressed, 65 bytes)
 */
function deriveStealthPublicKey(spendingPublicKey: string, sharedSecret: string): string {
    // Parse spending public key
    const spendPubBytes = fromHex(uncompressPublicKey(spendingPublicKey));
    const spendPubPoint = secp256k1.ProjectivePoint.fromHex(spendPubBytes);

    // Compute: sharedSecret * G
    const sharedSecretBigInt = BigInt(ensureHexPrefix(sharedSecret));
    const sharedPoint = secp256k1.ProjectivePoint.BASE.multiply(sharedSecretBigInt);

    // Add: spendPub + sharedPoint
    const stealthPubPoint = spendPubPoint.add(sharedPoint);

    // Convert to uncompressed bytes
    const stealthPubBytes = stealthPubPoint.toRawBytes(false);

    return toHex(stealthPubBytes);
}

/**
 * Convert an uncompressed public key to an Ethereum address
 * Address = last 20 bytes of keccak256(publicKey[1:]) // skip 0x04 prefix
 *
 * @param publicKey Uncompressed public key (65 bytes)
 * @returns Ethereum address (checksummed)
 */
function publicKeyToAddress(publicKey: string): string {
    // Remove 0x prefix and ensure uncompressed
    const uncompressed = uncompressPublicKey(publicKey);
    const pubKeyBytes = fromHex(uncompressed);

    // Remove first byte (0x04 prefix) for Ethereum address derivation
    const pubKeyWithoutPrefix = pubKeyBytes.slice(1);

    // Keccak256 hash
    const hash = keccak_256(pubKeyWithoutPrefix);

    // Take last 20 bytes and add 0x prefix
    const addressBytes = hash.slice(-20);
    const address = ensureHexPrefix(Buffer.from(addressBytes).toString('hex'));

    // Return checksummed address
    return getAddress(address);
}

/**
 * Derive Ethereum address from a private key
 * @param privateKey Private key as hex string
 * @returns Ethereum address
 */
export function privateKeyToAddress(privateKey: string): string {
    const privateKeyBytes = fromHex(privateKey);
    const publicKeyPoint = secp256k1.ProjectivePoint.fromPrivateKey(privateKeyBytes);
    const publicKeyBytes = publicKeyPoint.toRawBytes(false);
    const publicKey = toHex(publicKeyBytes);

    return publicKeyToAddress(publicKey);
}
