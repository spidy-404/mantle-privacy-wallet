'use client';

import { useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Navigation } from '@/components/navigation';
import { useKeysStore } from '@/lib/stores/keys-store';
import { mantleSepolia } from '@/lib/wagmi';
import {
    computeStealthPrivateKey,
    checkStealthAddress,
    createIndexerClient,
} from '@mantle-privacy/sdk';
import { formatEther, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import Link from 'next/link';

interface DiscoveredPayment {
    stealthAddress: string;
    stealthPrivateKey: string;
    blockNumber: number;
    txHash: string;
    balance: bigint;
}

export default function ReceivePage() {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const { viewingKeypair, spendingKeypair, hasKeys } = useKeysStore();

    const [payments, setPayments] = useState<DiscoveredPayment[]>([]);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [withdrawing, setWithdrawing] = useState<string | null>(null);
    const [success, setSuccess] = useState('');

    const scanForPayments = async () => {
        if (!viewingKeypair || !spendingKeypair || !publicClient) {
            setError('Keys not found. Please generate keys first.');
            return;
        }

        try {
            setScanning(true);
            setError('');

            const indexer = createIndexerClient({
                apiUrl: process.env.NEXT_PUBLIC_INDEXER_API || 'https://indexer-mantle.onrender.com',
            });

            const announcements = await indexer.getAnnouncements({ limit: 1000 });
            const discovered: DiscoveredPayment[] = [];

            for (const announcement of announcements) {
                if (announcement.schemeId !== 1) continue;

                try {
                    const stealthPrivKey = computeStealthPrivateKey(
                        viewingKeypair.privateKey,
                        spendingKeypair.privateKey,
                        announcement.ephemeralPubKey
                    );

                    const isForUs = checkStealthAddress(stealthPrivKey, announcement.stealthAddress);

                    if (isForUs) {
                        const balance = await publicClient.getBalance({
                            address: announcement.stealthAddress as `0x${string}`,
                        });

                        if (balance > 0n) {
                            discovered.push({
                                stealthAddress: announcement.stealthAddress,
                                stealthPrivateKey: stealthPrivKey,
                                blockNumber: parseInt(announcement.blockNumber),
                                txHash: announcement.transactionHash,
                                balance,
                            });
                        }
                    }
                } catch {
                    continue;
                }
            }

            setPayments(discovered);
        } catch (err: any) {
            console.error('Error scanning:', err);
            setError(err?.message || 'Failed to scan for payments');
        } finally {
            setScanning(false);
        }
    };

    const withdrawPayment = async (payment: DiscoveredPayment) => {
        if (!address) {
            setError('Wallet not connected');
            return;
        }

        try {
            setWithdrawing(payment.stealthAddress);
            setError('');

            const stealthAccount = privateKeyToAccount(payment.stealthPrivateKey as `0x${string}`);
            const stealthWalletClient = createWalletClient({
                account: stealthAccount,
                chain: mantleSepolia,
                transport: http(),
            });

            const balance = await publicClient!.getBalance({
                address: payment.stealthAddress as `0x${string}`,
            });

            const gasReserve = (balance * 10n) / 100n;
            const amountToSend = balance - gasReserve;

            if (amountToSend <= 0n) {
                setError('Balance too low to cover gas costs');
                return;
            }

            const hash = await stealthWalletClient.sendTransaction({
                to: address,
                value: amountToSend,
            });

            await publicClient!.waitForTransactionReceipt({ hash });

            setPayments((prev) =>
                prev.filter((p) => p.stealthAddress !== payment.stealthAddress)
            );

            setSuccess(`Successfully withdrew ${formatEther(amountToSend)} MNT!`);
        } catch (err: any) {
            console.error('Error withdrawing:', err);
            setError(err?.message || 'Failed to withdraw');
        } finally {
            setWithdrawing(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FC]">
            <Navigation />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#1A1D29] mb-2">Receive Payments</h1>
                    <p className="text-[#6B7280]">
                        Scan for incoming stealth payments
                    </p>
                </div>

                {!hasKeys ? (
                    <div className="bg-white rounded-2xl p-12 border border-[#E8EBF0] text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7] flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                <path d="M15 9C15 11.2091 13.2091 13 11 13C8.79086 13 7 11.2091 7 9C7 6.79086 8.79086 5 11 5C13.2091 5 15 6.79086 15 9Z" stroke="#D97706" strokeWidth="2"/>
                                <path d="M14 12L19 17M19 17V14M19 17H16" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-[#1A1D29] mb-2">
                            Keys Required
                        </h2>
                        <p className="text-[#6B7280] mb-6">
                            Generate your privacy keys to scan for incoming payments
                        </p>
                        <Link
                            href="/keys"
                            className="inline-flex items-center px-6 py-3 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium rounded-xl transition-all"
                        >
                            Generate Keys
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Scan Card */}
                        <div className="bg-white rounded-2xl border border-[#E8EBF0] overflow-hidden">
                            <div className="bg-[#1A1D29] p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Scan Blockchain</h2>
                                        <p className="text-[#8B8D97] text-sm">Find your private payments</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                <button
                                    onClick={scanForPayments}
                                    disabled={scanning}
                                    className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed text-white font-medium py-3.5 px-4 rounded-xl transition-all"
                                >
                                    {scanning ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                            </svg>
                                            Scanning blockchain...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            </svg>
                                            Scan for Payments
                                        </span>
                                    )}
                                </button>
                                <p className="text-xs text-[#9CA3AF] mt-3 text-center">
                                    Uses indexer for fast scanning of all announcements
                                </p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-[#FEE2E2] rounded-xl p-4 flex items-center gap-3">
                                <svg className="w-5 h-5 text-[#DC2626] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                                </svg>
                                <p className="text-[#991B1B]">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="bg-[#D1FAE5] rounded-xl p-4 flex items-center gap-3">
                                <svg className="w-5 h-5 text-[#059669] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                </svg>
                                <p className="text-[#065F46]">{success}</p>
                            </div>
                        )}

                        {/* Payments List */}
                        {payments.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-[#1A1D29]">
                                        Discovered Payments
                                    </h2>
                                    <span className="bg-[#D1FAE5] text-[#065F46] text-sm font-medium px-3 py-1 rounded-full">
                                        {payments.length} found
                                    </span>
                                </div>

                                {payments.map((payment) => (
                                    <div
                                        key={payment.stealthAddress}
                                        className="bg-white rounded-2xl border border-[#E8EBF0] overflow-hidden"
                                    >
                                        <div className="bg-[#D1FAE5] p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-[#059669]" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-[#065F46]">
                                                            {formatEther(payment.balance)} MNT
                                                        </p>
                                                        <p className="text-sm text-[#047857]">
                                                            Block #{payment.blockNumber}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            <div className="bg-[#F3F4F6] rounded-xl p-3">
                                                <p className="text-xs text-[#6B7280] mb-1">Stealth Address</p>
                                                <code className="text-xs text-[#374151] break-all font-mono">
                                                    {payment.stealthAddress}
                                                </code>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => withdrawPayment(payment)}
                                                    disabled={withdrawing === payment.stealthAddress}
                                                    className="flex-1 bg-[#10B981] hover:bg-[#059669] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-xl transition-all"
                                                >
                                                    {withdrawing === payment.stealthAddress ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                                            </svg>
                                                            Withdrawing...
                                                        </span>
                                                    ) : (
                                                        'Withdraw to Wallet'
                                                    )}
                                                </button>
                                                <a
                                                    href={`https://sepolia.mantlescan.xyz/tx/${payment.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] font-medium rounded-xl transition-all flex items-center gap-2"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11M15 3H21M21 3V9M21 3L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                    View
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : scanning ? null : (
                            <div className="bg-white rounded-2xl p-8 border border-[#E8EBF0] text-center">
                                <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                        <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-[#1A1D29] mb-2">
                                    No Payments Found
                                </h3>
                                <p className="text-[#6B7280] text-sm">
                                    No incoming stealth payments detected. Share your meta-address to receive private payments.
                                </p>
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="bg-[#DBEAFE] rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                </svg>
                                <p className="text-sm text-[#1E40AF]">
                                    We scan blockchain announcements and use your private keys to identify payments meant for you. Only you can see your incoming payments.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
