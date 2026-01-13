/**
 * Validation utilities
 */

import { isAddress, isHexString } from 'ethers';

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string): void {
    if (!isAddress(address)) {
        throw new Error(`Invalid Ethereum address: ${address}`);
    }
}

/**
 * Validate hex string
 */
export function validateHexString(hex: string, expectedLength?: number): void {
    if (!isHexString(hex)) {
        throw new Error(`Invalid hex string: ${hex}`);
    }

    if (expectedLength !== undefined) {
        // Remove 0x prefix for length check
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        const actualLength = cleanHex.length / 2; // Convert hex chars to bytes
        if (actualLength !== expectedLength) {
            throw new Error(`Expected ${expectedLength} bytes, got ${actualLength} bytes`);
        }
    }
}

/**
 * Validate private key (32 bytes)
 */
export function validatePrivateKey(privateKey: string): void {
    validateHexString(privateKey, 32);
}

/**
 * Validate public key (65 bytes uncompressed or 33 bytes compressed)
 */
export function validatePublicKey(publicKey: string): void {
    const cleanHex = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    const byteLength = cleanHex.length / 2;

    if (byteLength !== 65 && byteLength !== 33) {
        throw new Error(`Invalid public key length: ${byteLength} bytes (expected 65 or 33)`);
    }
}

/**
 * Validate stealth meta-address encoding
 */
export function validateStealthMetaAddress(encoded: string): void {
    const parts = encoded.split(':');
    if (parts.length !== 2) {
        throw new Error('Invalid stealth meta-address format (expected viewPub:spendPub)');
    }

    try {
        validatePublicKey(parts[0]);
        validatePublicKey(parts[1]);
    } catch (error) {
        throw new Error(`Invalid stealth meta-address: ${error}`);
    }
}
