/**
 * Encoding utilities for keys and addresses
 */

import { hexlify, getBytes, zeroPadValue } from 'ethers';

/**
 * Convert Uint8Array to hex string with 0x prefix
 */
export function toHex(bytes: Uint8Array): string {
    return hexlify(bytes);
}

/**
 * Convert hex string to Uint8Array
 */
export function fromHex(hex: string): Uint8Array {
    return getBytes(hex);
}

/**
 * Ensure hex string has 0x prefix
 */
export function ensureHexPrefix(str: string): string {
    return str.startsWith('0x') ? str : `0x${str}`;
}

/**
 * Remove 0x prefix from hex string
 */
export function removeHexPrefix(str: string): string {
    return str.startsWith('0x') ? str.slice(2) : str;
}

/**
 * Pad hex string to specified byte length
 */
export function padHex(hex: string, byteLength: number): string {
    return zeroPadValue(ensureHexPrefix(hex), byteLength);
}

/**
 * Concatenate multiple hex strings
 */
export function concatHex(...hexStrings: string[]): string {
    const combined = hexStrings.map(removeHexPrefix).join('');
    return ensureHexPrefix(combined);
}

/**
 * Compare two hex strings for equality (case-insensitive)
 */
export function hexEqual(a: string, b: string): boolean {
    return removeHexPrefix(a).toLowerCase() === removeHexPrefix(b).toLowerCase();
}
