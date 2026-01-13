/**
 * ECDH (Elliptic Curve Diffie-Hellman) for shared secret derivation
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { toHex, fromHex, removeHexPrefix } from '../utils/encoding';
import { validatePrivateKey, validatePublicKey } from '../utils/validation';

/**
 * Compute ECDH shared secret between a private key and a public key
 * This is the core cryptographic operation for stealth addresses
 *
 * Sender: shared = ephemeralPrivateKey * recipientViewingPublicKey
 * Recipient: shared = viewingPrivateKey * ephemeralPublicKey
 *
 * Both computations yield the same shared secret due to ECDH properties
 *
 * @param privateKey Private key as hex string (32 bytes)
 * @param publicKey Public key as hex string (33 or 65 bytes)
 * @returns Shared secret as hex string (32 bytes)
 */
export function computeSharedSecret(privateKey: string, publicKey: string): string {
    validatePrivateKey(privateKey);
    validatePublicKey(publicKey);

    // Convert to bytes
    const privateKeyBytes = fromHex(privateKey);
    const publicKeyBytes = fromHex(publicKey);

    // Parse public key point
    const publicKeyPoint = secp256k1.ProjectivePoint.fromHex(publicKeyBytes);

    // Multiply: shared_point = privateKey * publicKey
    const sharedPoint = publicKeyPoint.multiply(BigInt(`0x${removeHexPrefix(privateKey)}`));

    // Get x-coordinate of shared point (compressed representation)
    const sharedPointBytes = sharedPoint.toRawBytes(true); // 33 bytes compressed

    // Hash the shared point to get 32-byte shared secret
    // Using SHA-256 as specified in ERC-5564
    const sharedSecret = sha256(sharedPointBytes);

    return toHex(sharedSecret);
}

/**
 * Compute shared secret from sender's perspective
 * @param ephemeralPrivateKey Sender's ephemeral private key
 * @param recipientViewingPublicKey Recipient's viewing public key
 * @returns Shared secret
 */
export function computeSharedSecretSender(
    ephemeralPrivateKey: string,
    recipientViewingPublicKey: string
): string {
    return computeSharedSecret(ephemeralPrivateKey, recipientViewingPublicKey);
}

/**
 * Compute shared secret from recipient's perspective
 * @param viewingPrivateKey Recipient's viewing private key
 * @param ephemeralPublicKey Sender's ephemeral public key from announcement
 * @returns Shared secret
 */
export function computeSharedSecretRecipient(
    viewingPrivateKey: string,
    ephemeralPublicKey: string
): string {
    return computeSharedSecret(viewingPrivateKey, ephemeralPublicKey);
}

/**
 * Generate view tag for faster scanning (optional optimization)
 * View tag is first byte of shared secret, allowing recipients to quickly
 * filter out payments that aren't for them without full key derivation
 *
 * @param sharedSecret Shared secret from ECDH
 * @returns View tag as hex string (1 byte)
 */
export function generateViewTag(sharedSecret: string): string {
    const bytes = fromHex(sharedSecret);
    return toHex(bytes.slice(0, 1));
}
