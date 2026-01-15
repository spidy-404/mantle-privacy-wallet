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

            const meta = parseStealthMetaAddress(recipientMetaAddress.trim());
            const stealthInfo = generateStealthAddress(meta, 1);
            setDerivedStealthAddress(stealthInfo.stealthAddress);

            writeContract({
                address: CONTRACTS.StealthPay,
                abi: STEALTH_PAY_ABI,
                functionName: 'sendEtherStealth',
                args: [
                    BigInt(1),
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
        <div className="min-h-screen bg-[#F8F9FC]">
            <Navigation />

            <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#1A1D29] mb-2">Send Private Payment</h1>
                    <p className="text-[#6B7280]">
                        Send MNT to a stealth address on Mantle Network
                    </p>
                </div>

                {!isConnected ? (
                    <div className="bg-white rounded-2xl p-12 border border-[#E8EBF0] text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#DBEAFE] flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                <path d="M20 4L3 11L10 14M20 4L17 21L10 14M20 4L10 14" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-[#1A1D29] mb-2">
                            Connect Your Wallet
                        </h2>
                        <p className="text-[#6B7280]">
                            Please connect your wallet to send payments
                        </p>
                    </div>
                ) : isSuccess ? (
                    <div className="bg-white rounded-2xl border border-[#E8EBF0] overflow-hidden">
                        <div className="bg-[#D1FAE5] p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-[#059669]" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-[#065F46] mb-1">
                                Payment Sent Successfully!
                            </h2>
                            <p className="text-[#047857]">
                                Your private payment has been delivered
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            {derivedStealthAddress && (
                                <div>
                                    <p className="text-sm text-[#6B7280] mb-2">Stealth Address</p>
                                    <div className="bg-[#F3F4F6] rounded-xl p-4">
                                        <code className="text-[#059669] text-sm break-all font-mono">
                                            {derivedStealthAddress}
                                        </code>
                                    </div>
                                </div>
                            )}

                            {hash && (
                                <a
                                    href={`https://sepolia.mantlescan.xyz/tx/${hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 text-[#6366F1] hover:text-[#4F46E5] font-medium"
                                >
                                    View on Mantle Explorer
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11M15 3H21M21 3V9M21 3L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </a>
                            )}

                            <button
                                onClick={resetForm}
                                className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium py-3 px-4 rounded-xl transition-all"
                            >
                                Send Another Payment
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-[#E8EBF0] overflow-hidden">
                        <div className="bg-[#1A1D29] p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 4L3 11L10 14M20 4L17 21L10 14M20 4L10 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Send Payment</h2>
                                    <p className="text-[#8B8D97] text-sm">Private stealth transfer</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[#1A1D29] mb-2">
                                    Recipient Meta-Address
                                </label>
                                <textarea
                                    value={recipientMetaAddress}
                                    onChange={(e) => setRecipientMetaAddress(e.target.value)}
                                    placeholder="st:eth:0x04...:0x04..."
                                    rows={3}
                                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1A1D29] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent font-mono text-sm resize-none"
                                />
                                <p className="text-xs text-[#9CA3AF] mt-2">
                                    Enter the recipient's public stealth meta-address
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#1A1D29] mb-2">
                                    Amount (MNT)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.1"
                                        className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1A1D29] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] font-medium">
                                        MNT
                                    </span>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-[#FEE2E2] rounded-xl p-4 flex items-center gap-3">
                                    <svg className="w-5 h-5 text-[#DC2626] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                                    </svg>
                                    <p className="text-[#991B1B] text-sm">{error}</p>
                                </div>
                            )}

                            {derivedStealthAddress && !error && (
                                <div className="bg-[#D1FAE5] rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-[#059669] flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                        </svg>
                                        <div>
                                            <p className="text-sm font-medium text-[#065F46]">Stealth address generated</p>
                                            <code className="text-xs text-[#047857] break-all font-mono">
                                                {derivedStealthAddress}
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-[#DBEAFE] rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                    </svg>
                                    <p className="text-sm text-[#1E40AF]">
                                        A unique stealth address is generated for this payment. Only the recipient can identify and withdraw the funds.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleSendPayment}
                                disabled={isPending || isConfirming}
                                className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed text-white font-medium py-3.5 px-4 rounded-xl transition-all"
                            >
                                {isPending || isConfirming ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
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
