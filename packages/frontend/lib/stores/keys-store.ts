import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Keypair, StealthMetaAddress } from '@mantle-privacy/sdk';

interface KeysState {
    viewingKeypair: Keypair | null;
    spendingKeypair: Keypair | null;
    stealthMetaAddress: StealthMetaAddress | null;
    hasKeys: boolean;

    setKeys: (viewing: Keypair, spending: Keypair, meta: StealthMetaAddress) => void;
    clearKeys: () => void;
}

/**
 * Store for managing stealth address keys
 * Keys are persisted to localStorage (encrypted in production)
 */
export const useKeysStore = create<KeysState>()(
    persist(
        (set) => ({
            viewingKeypair: null,
            spendingKeypair: null,
            stealthMetaAddress: null,
            hasKeys: false,

            setKeys: (viewing, spending, meta) =>
                set({
                    viewingKeypair: viewing,
                    spendingKeypair: spending,
                    stealthMetaAddress: meta,
                    hasKeys: true,
                }),

            clearKeys: () =>
                set({
                    viewingKeypair: null,
                    spendingKeypair: null,
                    stealthMetaAddress: null,
                    hasKeys: false,
                }),
        }),
        {
            name: 'mantle-privacy-keys',
            // In production, you'd want to encrypt this data
        }
    )
);
