'use client';

import { useState } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { Navigation } from '@/components/navigation';
import { CONTRACTS } from '@/lib/wagmi';
import { generateStealthAddress, parseStealthMetaAddress } from '@mantle-privacy/sdk';

const STEALTH_PAY_ABI = [
    {
        inputs: [
            { name: 'schemeId', type: 'uint256' },
            { name: 'stealthAddress', type: 'address' },
            { name: 'ephemeralPubKey', type: 'bytes' },
            { name: 'metadata', type: 'bytes' },
        ],
        name: 'sendEtherStealth',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
] as const;

export default function SendPage() {
    const { address, isConnected } = useAccount();
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const [recipientMetaAddress, setRecipientMetaAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [derivedStealthAddress, setDerivedStealthAddress] = useState('');

    const handleSendPayment = async () => {
        try {
            setError('');

            if (!isConnected || !address) {
                setError('Please connect your wallet');
                return;
            }

            if (!recipientMetaAddress) {
                setError('Please enter recipient meta-address');
                return;
            }

            if (!amount || parseFloat(amount) <= 0) {
                setError('Please enter valid amount');
                return;
            }

            // Parse and validate meta-address
            const meta = parseStealthMetaAddress(recipientMetaAddress.trim());

            // Generate stealth address
            const stealthInfo = generateStealthAddress(meta, 1);
            setDerivedStealthAddress(stealthInfo.stealthAddress);

            // Send transaction
            writeContract({
                address: CONTRACTS.StealthPay,
                abi: STEALTH_PAY_ABI,
                functionName: 'sendEtherStealth',
                args: [
                    BigInt(1), // schemeId (secp256k1)
                    stealthInfo.stealthAddress as `0x${string}`,
                    stealthInfo.ephemeralPublicKey as `0x${string}`,
                    stealthInfo.metadata as `0x${string}`,
                ],
                value: parseEther(amount),
            });
        } catch (err: any) {
            console.error('Error sending payment:', err);
            setError(err?.message || 'Failed to send payment');
        }
    };

    const resetForm = () => {
        setRecipientMetaAddress('');
        setAmount('');
        setError('');
        setDerivedStealthAddress('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <Navigation />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Send Private Payment</h1>
                    <p className="text-gray-400">
                        Send MNT to a stealth address on Mantle Sepolia
                    </p>
                </div>

                {!isConnected ? (
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                        <div className="text-5xl mb-4">🔗</div>
                        <h2 className="text-2xl font-semibold text-white mb-2">
                            Connect Your Wallet
                        </h2>
                        <p className="text-gray-400">
                            Please connect your wallet to send payments
                        </p>
                    </div>
                ) : isSuccess ? (
                    <div className="bg-gray-800 rounded-lg p-8 border border-green-700">
                        <div className="text-center">
                            <div className="text-5xl mb-4">✅</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                Payment Sent Successfully!
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Your private payment has been sent
                            </p>

                            {derivedStealthAddress && (
                                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 mb-6">
                                    <p className="text-sm text-gray-400 mb-2">Stealth Address:</p>
                                    <code className="text-green-400 text-sm break-all">
                                        {derivedStealthAddress}
                                    </code>
                                </div>
                            )}

                            {hash && (
                                <div className="mb-6">
                                    <a
                                        href={`https://sepolia.mantlescan.xyz/tx/${hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-400 hover:text-indigo-300 underline"
                                    >
                                        View on Mantle Explorer →
                                    </a>
                                </div>
                            )}

                            <button
                                onClick={resetForm}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                            >
                                Send Another Payment
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="space-y-6">
                            {/* Recipient Meta-Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Recipient Stealth Meta-Address
                                </label>
                                <input
                                    type="text"
                                    value={recipientMetaAddress}
                                    onChange={(e) => setRecipientMetaAddress(e.target.value)}
                                    placeholder="0x04....:0x03...."
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Enter the recipient's public stealth meta-address
                                </p>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Amount (MNT)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.1"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Amount of MNT to send
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Derived Stealth Address Preview */}
                            {derivedStealthAddress && !error && (
                                <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                                    <p className="text-sm text-green-300 mb-2">
                                        ✓ Stealth address generated:
                                    </p>
                                    <code className="text-green-400 text-xs break-all">
                                        {derivedStealthAddress}
                                    </code>
                                </div>
                            )}

                            {/* Info Box */}
                            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                                <p className="text-blue-300 text-sm">
                                    <strong>ℹ️ How it works:</strong> A unique stealth address is
                                    generated for this payment. Only the recipient can identify and
                                    withdraw the funds using their private keys.
                                </p>
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={handleSendPayment}
                                disabled={isPending || isConfirming}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                            >
                                {isPending || isConfirming ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg
                                            className="animate-spin h-5 w-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        {isPending ? 'Confirm in wallet...' : 'Confirming...'}
                                    </span>
                                ) : (
                                    'Send Private Payment'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
