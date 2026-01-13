'use client';

import { useState } from 'react';
import { Navigation } from '@/components/navigation';
import { useKeysStore } from '@/lib/stores/keys-store';
import {
    generateViewingKeypair,
    generateSpendingKeypair,
    generateStealthMetaAddress,
} from '@mantle-privacy/sdk';

export default function KeysPage() {
    const { viewingKeypair, spendingKeypair, stealthMetaAddress, hasKeys, setKeys, clearKeys } =
        useKeysStore();

    const [showPrivateKeys, setShowPrivateKeys] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const generateKeys = () => {
        const viewing = generateViewingKeypair();
        const spending = generateSpendingKeypair();
        const meta = generateStealthMetaAddress(viewing.publicKey, spending.publicKey);

        setKeys(viewing, spending, meta);
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(label);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const downloadKeys = () => {
        if (!viewingKeypair || !spendingKeypair || !stealthMetaAddress) return;

        const data = {
            viewingKeypair,
            spendingKeypair,
            stealthMetaAddress,
            timestamp: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mantle-privacy-keys-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <Navigation />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Key Management</h1>
                    <p className="text-gray-400">
                        Generate and manage your stealth address keys
                    </p>
                </div>

                {!hasKeys ? (
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                        <div className="text-center mb-6">
                            <div className="text-5xl mb-4">🔑</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                Generate Your Keys
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Create viewing and spending keypairs to start receiving private payments
                            </p>
                        </div>

                        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-6">
                            <p className="text-yellow-300 text-sm">
                                <strong>⚠️ Important:</strong> These keys control access to your stealth
                                payments. Make sure to backup them securely. Losing your keys means losing
                                access to your funds.
                            </p>
                        </div>

                        <button
                            onClick={generateKeys}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                        >
                            Generate Keys
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Stealth Meta-Address */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <h3 className="text-xl font-semibold text-white mb-4">
                                Your Stealth Meta-Address
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Share this with anyone who wants to send you private payments
                            </p>
                            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                <div className="flex justify-between items-start gap-4">
                                    <code className="text-indigo-400 text-sm break-all">
                                        {stealthMetaAddress?.encoded}
                                    </code>
                                    <button
                                        onClick={() =>
                                            copyToClipboard(
                                                stealthMetaAddress?.encoded || '',
                                                'meta-address'
                                            )
                                        }
                                        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {copied === 'meta-address' ? '✓ Copied' : '📋 Copy'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Viewing Keypair */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <h3 className="text-xl font-semibold text-white mb-4">
                                Viewing Keypair
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Used to scan for incoming payments
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        Public Key
                                    </label>
                                    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                        <div className="flex justify-between items-start gap-4">
                                            <code className="text-green-400 text-xs break-all">
                                                {viewingKeypair?.publicKey}
                                            </code>
                                            <button
                                                onClick={() =>
                                                    copyToClipboard(
                                                        viewingKeypair?.publicKey || '',
                                                        'view-pub'
                                                    )
                                                }
                                                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors text-xs"
                                            >
                                                {copied === 'view-pub' ? '✓' : '📋'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {showPrivateKeys && (
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">
                                            Private Key (Keep Secret!)
                                        </label>
                                        <div className="bg-red-900/20 rounded-lg p-3 border border-red-700/50">
                                            <div className="flex justify-between items-start gap-4">
                                                <code className="text-red-400 text-xs break-all">
                                                    {viewingKeypair?.privateKey}
                                                </code>
                                                <button
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            viewingKeypair?.privateKey || '',
                                                            'view-priv'
                                                        )
                                                    }
                                                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors text-xs"
                                                >
                                                    {copied === 'view-priv' ? '✓' : '📋'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Spending Keypair */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <h3 className="text-xl font-semibold text-white mb-4">
                                Spending Keypair
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Used to derive stealth private keys and withdraw funds
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">
                                        Public Key
                                    </label>
                                    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                        <div className="flex justify-between items-start gap-4">
                                            <code className="text-green-400 text-xs break-all">
                                                {spendingKeypair?.publicKey}
                                            </code>
                                            <button
                                                onClick={() =>
                                                    copyToClipboard(
                                                        spendingKeypair?.publicKey || '',
                                                        'spend-pub'
                                                    )
                                                }
                                                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors text-xs"
                                            >
                                                {copied === 'spend-pub' ? '✓' : '📋'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {showPrivateKeys && (
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">
                                            Private Key (Keep Secret!)
                                        </label>
                                        <div className="bg-red-900/20 rounded-lg p-3 border border-red-700/50">
                                            <div className="flex justify-between items-start gap-4">
                                                <code className="text-red-400 text-xs break-all">
                                                    {spendingKeypair?.privateKey}
                                                </code>
                                                <button
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            spendingKeypair?.privateKey || '',
                                                            'spend-priv'
                                                        )
                                                    }
                                                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors text-xs"
                                                >
                                                    {copied === 'spend-priv' ? '✓' : '📋'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowPrivateKeys(!showPrivateKeys)}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                            >
                                {showPrivateKeys ? '🙈 Hide' : '👁️ Show'} Private Keys
                            </button>
                            <button
                                onClick={downloadKeys}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                            >
                                💾 Download Backup
                            </button>
                        </div>

                        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                            <p className="text-red-300 text-sm mb-3">
                                <strong>⚠️ Danger Zone:</strong> This will permanently delete your keys
                                from this browser. Make sure you have a backup!
                            </p>
                            <button
                                onClick={() => {
                                    if (
                                        confirm(
                                            'Are you sure? This will delete your keys permanently. Make sure you have a backup!'
                                        )
                                    ) {
                                        clearKeys();
                                    }
                                }}
                                className="bg-red-700 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                Delete Keys
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
