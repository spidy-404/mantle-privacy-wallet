'use client';

import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { Navigation } from '@/components/navigation';
import { useKeysStore } from '@/lib/stores/keys-store';
import { CONTRACTS, mantleSepolia } from '@/lib/wagmi';
import {
    computeStealthPrivateKey,
    checkStealthAddress,
    privateKeyToAddress,
} from '@mantle-privacy/sdk';
import { parseEther, formatEther } from 'viem';
import Link from 'next/link';

interface DiscoveredPayment {
    stealthAddress: string;
    stealthPrivateKey: string;
    blockNumber: number;
    txHash: string;
    balance: bigint;
}

const ANNOUNCER_ABI = [
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'schemeId', type: 'uint256' },
            { indexed: true, name: 'stealthAddress', type: 'address' },
            { indexed: true, name: 'caller', type: 'address' },
            { name: 'ephemeralPubKey', type: 'bytes' },
            { name: 'metadata', type: 'bytes' },
        ],
        name: 'Announcement',
        type: 'event',
    },
] as const;

export default function ReceivePage() {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const { viewingKeypair, spendingKeypair, hasKeys } = useKeysStore();

    const [payments, setPayments] = useState<DiscoveredPayment[]>([]);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [withdrawing, setWithdrawing] = useState<string | null>(null);

    const scanForPayments = async () => {
        if (!viewingKeypair || !spendingKeypair || !publicClient) {
            setError('Keys not found. Please generate keys first.');
            return;
        }

        try {
            setScanning(true);
            setError('');

            // Get current block number
            const currentBlock = await publicClient.getBlockNumber();
            const fromBlock = currentBlock - BigInt(10000); // Scan last ~10k blocks

            console.log(`Scanning from block ${fromBlock} to ${currentBlock}...`);

            // Fetch Announcement events
            const logs = await publicClient.getLogs({
                address: CONTRACTS.ERC5564Announcer,
                event: ANNOUNCER_ABI[0],
                fromBlock,
                toBlock: currentBlock,
            });

            console.log(`Found ${logs.length} announcements`);

            const discovered: DiscoveredPayment[] = [];

            // Check each announcement
            for (const log of logs) {
                const { schemeId, stealthAddress, ephemeralPubKey } = log.args;

                // Only process secp256k1 scheme
                if (schemeId !== BigInt(1)) continue;

                try {
                    // Compute stealth private key
                    const stealthPrivKey = computeStealthPrivateKey(
                        viewingKeypair.privateKey,
                        spendingKeypair.privateKey,
                        ephemeralPubKey as string
                    );

                    // Check if this payment is for us
                    const isForUs = checkStealthAddress(
                        stealthPrivKey,
                        stealthAddress as string
                    );

                    if (isForUs) {
                        // Get balance of stealth address
                        const balance = await publicClient.getBalance({
                            address: stealthAddress as `0x${string}`,
                        });

                        if (balance > 0n) {
                            discovered.push({
                                stealthAddress: stealthAddress as string,
                                stealthPrivateKey: stealthPrivKey,
                                blockNumber: Number(log.blockNumber),
                                txHash: log.transactionHash!,
                                balance,
                            });
                        }
                    }
                } catch (err) {
                    // Not for us, skip
                    continue;
                }
            }

            setPayments(discovered);
            console.log(`Discovered ${discovered.length} payments for you`);
        } catch (err: any) {
            console.error('Error scanning:', err);
            setError(err?.message || 'Failed to scan for payments');
        } finally {
            setScanning(false);
        }
    };

    const withdrawPayment = async (payment: DiscoveredPayment) => {
        if (!walletClient || !address) {
            setError('Wallet not connected');
            return;
        }

        try {
            setWithdrawing(payment.stealthAddress);
            setError('');

            // Get the balance to withdraw
            const balance = await publicClient!.getBalance({
                address: payment.stealthAddress as `0x${string}`,
            });

            // Estimate gas
            const gasEstimate = await publicClient!.estimateGas({
                account: payment.stealthAddress as `0x${string}`,
                to: address,
                value: balance,
            });

            const gasPrice = await publicClient!.getGasPrice();
            const gasCost = gasEstimate * gasPrice;

            // Amount to send (balance minus gas)
            const amountToSend = balance - gasCost - parseEther('0.0001'); // Small buffer

            if (amountToSend <= 0n) {
                setError('Balance too low to cover gas costs');
                return;
            }

            // Send transaction from stealth address to main wallet
            const hash = await walletClient.sendTransaction({
                account: payment.stealthAddress as `0x${string}`,
                to: address,
                value: amountToSend,
                kzg: undefined,
            });

            console.log('Withdrawal tx:', hash);

            // Wait for confirmation
            await publicClient!.waitForTransactionReceipt({ hash });

            // Update payments list (remove withdrawn payment)
            setPayments((prev) =>
                prev.filter((p) => p.stealthAddress !== payment.stealthAddress)
            );

            alert('Withdrawal successful!');
        } catch (err: any) {
            console.error('Error withdrawing:', err);
            setError(err?.message || 'Failed to withdraw');
        } finally {
            setWithdrawing(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <Navigation />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Receive Payments</h1>
                    <p className="text-gray-400">
                        Scan for incoming stealth payments on Mantle Sepolia
                    </p>
                </div>

                {!hasKeys ? (
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                        <div className="text-5xl mb-4">🔑</div>
                        <h2 className="text-2xl font-semibold text-white mb-2">
                            Keys Required
                        </h2>
                        <p className="text-gray-400 mb-6">
                            You need to generate keys before scanning for payments
                        </p>
                        <Link
                            href="/keys"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Generate Keys
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Scan Button */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <button
                                onClick={scanForPayments}
                                disabled={scanning}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                            >
                                {scanning ? (
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
                                        Scanning blockchain...
                                    </span>
                                ) : (
                                    '🔍 Scan for Payments'
                                )}
                            </button>
                            <p className="text-sm text-gray-500 mt-2 text-center">
                                Scans the last ~10,000 blocks for incoming payments
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Payments List */}
                        {payments.length > 0 ? (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-white">
                                    Discovered Payments ({payments.length})
                                </h2>

                                {payments.map((payment) => (
                                    <div
                                        key={payment.stealthAddress}
                                        className="bg-gray-800 rounded-lg p-6 border border-green-700"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-2xl">💰</span>
                                                    <span className="text-2xl font-bold text-green-400">
                                                        {formatEther(payment.balance)} MNT
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-400">
                                                    Block: {payment.blockNumber}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-gray-900 rounded-lg p-3 mb-4 border border-gray-700">
                                            <p className="text-xs text-gray-400 mb-1">
                                                Stealth Address:
                                            </p>
                                            <code className="text-green-400 text-xs break-all">
                                                {payment.stealthAddress}
                                            </code>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => withdrawPayment(payment)}
                                                disabled={withdrawing === payment.stealthAddress}
                                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                            >
                                                {withdrawing === payment.stealthAddress ? (
                                                    'Withdrawing...'
                                                ) : (
                                                    'Withdraw to Main Wallet'
                                                )}
                                            </button>
                                            <a
                                                href={`https://sepolia.mantlescan.xyz/tx/${payment.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                            >
                                                View Tx
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : scanning ? null : (
                            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                                <div className="text-5xl mb-4">📭</div>
                                <h3 className="text-xl font-semibold text-white mb-2">
                                    No Payments Found
                                </h3>
                                <p className="text-gray-400">
                                    No incoming stealth payments detected. Try scanning again or
                                    share your meta-address with someone.
                                </p>
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                            <p className="text-blue-300 text-sm">
                                <strong>ℹ️ How it works:</strong> We scan the blockchain for
                                Announcement events, then use your private keys to check if each
                                payment is for you. Only you can identify your payments.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
