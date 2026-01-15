'use client';

import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { Navigation } from '@/components/navigation';
import { CONTRACTS } from '@/lib/wagmi';
import { parseEther, formatEther } from 'viem';
import {
    generateDepositNote,
    generateWithdrawProof,
    proofToCalldata,
    createIndexerClient,
} from '@mantle-privacy/sdk';

const DENOMINATIONS = [
    { label: '0.1', value: '0.1' },
    { label: '1', value: '1' },
    { label: '10', value: '10' },
];

const SHIELDED_POOL_ABI = [
    {
        inputs: [
            { name: 'commitment', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
        ],
        name: 'deposit',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            { name: 'proof', type: 'uint256[8]' },
            { name: 'root', type: 'uint256' },
            { name: 'nullifierHash', type: 'uint256' },
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        name: 'withdraw',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getRoot',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export default function ShieldPage() {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    const [selectedDenomination, setSelectedDenomination] = useState('0.1');
    const [depositNote, setDepositNote] = useState<string | null>(null);
    const [depositing, setDepositing] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [status, setStatus] = useState('');

    const [withdrawNote, setWithdrawNote] = useState('');
    const [withdrawRecipient, setWithdrawRecipient] = useState('');

    const handleDeposit = async () => {
        if (!walletClient || !address) {
            setError('Wallet not connected');
            return;
        }

        try {
            setDepositing(true);
            setError('');
            setSuccess('');

            const amount = parseEther(selectedDenomination);
            const note = await generateDepositNote(BigInt(amount.toString()));

            const hash = await walletClient.writeContract({
                address: CONTRACTS.ShieldedPool,
                abi: SHIELDED_POOL_ABI,
                functionName: 'deposit',
                args: [BigInt(note.commitment), amount],
                value: amount,
            });

            await publicClient!.waitForTransactionReceipt({ hash });

            const noteString = JSON.stringify(note, null, 2);
            setDepositNote(noteString);
            setSuccess(`Deposit successful! Save your note below.`);
        } catch (err: any) {
            console.error('Deposit error:', err);
            setError(err?.message || 'Failed to deposit');
        } finally {
            setDepositing(false);
        }
    };

    const downloadNote = () => {
        if (!depositNote) return;
        const blob = new Blob([depositNote], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shield-note-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleWithdraw = async () => {
        if (!walletClient || !address) {
            setError('Wallet not connected');
            return;
        }

        try {
            setWithdrawing(true);
            setError('');
            setSuccess('');
            setStatus('Parsing deposit note...');

            const note = JSON.parse(withdrawNote);
            const recipient = withdrawRecipient || address;

            const indexer = createIndexerClient({
                apiUrl: process.env.NEXT_PUBLIC_INDEXER_API || 'https://indexer-mantle.onrender.com',
            });

            setStatus('Fetching Merkle path...');
            const merklePath = await indexer.getMerklePath(note.commitment);

            setStatus('Verifying Merkle root...');
            const contractRoot = await publicClient!.readContract({
                address: CONTRACTS.ShieldedPool,
                abi: SHIELDED_POOL_ABI,
                functionName: 'getRoot',
            });

            if (BigInt(merklePath.root) !== contractRoot) {
                setStatus('');
                setError('Merkle root mismatch. Please try again.');
                return;
            }

            const CIRCUIT_WASM_URL = '/circuits/withdraw.wasm';
            const CIRCUIT_ZKEY_URL = '/circuits/withdraw.zkey';

            setStatus('Generating ZK proof (30-60s)...');

            const proof = await generateWithdrawProof({
                secret: note.secret,
                nullifier: note.nullifier,
                pathElements: merklePath.pathElements,
                pathIndices: merklePath.pathIndices,
                root: merklePath.root,
                nullifierHash: note.nullifierHash,
                recipient: recipient,
                amount: note.amount,
            }, CIRCUIT_WASM_URL, CIRCUIT_ZKEY_URL);

            const calldata = proofToCalldata(proof);

            setStatus('Submitting transaction...');

            const hash = await walletClient.writeContract({
                address: CONTRACTS.ShieldedPool,
                abi: SHIELDED_POOL_ABI,
                functionName: 'withdraw',
                args: [
                    calldata.proof.map(p => BigInt(p)) as unknown as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint],
                    BigInt(merklePath.root),
                    BigInt(note.nullifierHash),
                    recipient as `0x${string}`,
                    BigInt(note.amount)
                ],
            });

            setStatus('Waiting for confirmation...');

            try {
                await publicClient!.waitForTransactionReceipt({
                    hash,
                    timeout: 60_000,
                    pollingInterval: 2_000,
                });
                setSuccess(`Withdrawal successful! ${formatEther(BigInt(note.amount))} MNT sent to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`);
            } catch (receiptError: any) {
                setSuccess(`Withdrawal submitted! Check your wallet for incoming funds.`);
            }
        } catch (err: any) {
            console.error('Withdraw error:', err);
            if (err?.name === 'TransactionReceiptNotFoundError') {
                setSuccess(`Withdrawal likely successful! Check your wallet.`);
            } else {
                setError(err?.message || 'Failed to withdraw');
            }
        } finally {
            setWithdrawing(false);
            setStatus('');
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FC]">
            <Navigation />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#1A1D29] mb-2">Shielded Pool</h1>
                    <p className="text-[#6B7280]">
                        Hide transaction amounts using zero-knowledge proofs
                    </p>
                </div>

                {!isConnected ? (
                    <div className="bg-white rounded-2xl p-12 border border-[#E8EBF0] text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[#EDE9FE] flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3L4 7V12C4 16.42 7.11 20.51 12 21C16.89 20.51 20 16.42 20 12V7L12 3Z" stroke="#7C3AED" strokeWidth="2"/>
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-[#1A1D29] mb-2">
                            Connect Your Wallet
                        </h2>
                        <p className="text-[#6B7280]">
                            Please connect your wallet to use the shielded pool
                        </p>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Deposit Card */}
                        <div className="bg-white rounded-2xl border border-[#E8EBF0] overflow-hidden">
                            <div className="bg-[#1A1D29] p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 4V20M12 4L6 10M12 4L18 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Deposit</h2>
                                        <p className="text-[#8B8D97] text-sm">Add funds to pool</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-[#1A1D29] mb-3">
                                        Select Amount (MNT)
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {DENOMINATIONS.map((denom) => (
                                            <button
                                                key={denom.value}
                                                onClick={() => setSelectedDenomination(denom.value)}
                                                className={`py-3 px-4 rounded-xl font-medium transition-all ${
                                                    selectedDenomination === denom.value
                                                        ? 'bg-[#6366F1] text-white'
                                                        : 'bg-[#F3F4F6] text-[#1A1D29] hover:bg-[#E5E7EB]'
                                                }`}
                                            >
                                                {denom.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleDeposit}
                                    disabled={depositing}
                                    className="w-full bg-[#10B981] hover:bg-[#059669] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed text-white font-medium py-3.5 px-4 rounded-xl transition-all"
                                >
                                    {depositing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : 'Deposit to Pool'}
                                </button>

                                {depositNote && (
                                    <div className="space-y-3 animate-fadeIn">
                                        <div className="bg-[#FEF3C7] rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <svg className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                                                </svg>
                                                <div>
                                                    <p className="font-medium text-[#92400E]">Save Your Note!</p>
                                                    <p className="text-sm text-[#B45309] mt-1">
                                                        This note is required to withdraw. Without it, your funds are lost forever.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-[#F3F4F6] rounded-xl p-4">
                                            <pre className="text-xs text-[#374151] overflow-x-auto font-mono">
                                                {depositNote}
                                            </pre>
                                        </div>

                                        <button
                                            onClick={downloadNote}
                                            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M12 3V15M12 15L7 10M12 15L17 10M5 21H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            Download Note
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Withdraw Card */}
                        <div className="bg-white rounded-2xl border border-[#E8EBF0] overflow-hidden">
                            <div className="bg-[#1A1D29] p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 20V4M12 20L6 14M12 20L18 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Withdraw</h2>
                                        <p className="text-[#8B8D97] text-sm">Claim with ZK proof</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-[#1A1D29] mb-2">
                                        Deposit Note (JSON)
                                    </label>
                                    <textarea
                                        value={withdrawNote}
                                        onChange={(e) => setWithdrawNote(e.target.value)}
                                        placeholder='Paste your deposit note JSON here...'
                                        rows={5}
                                        className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1A1D29] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent font-mono text-xs resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#1A1D29] mb-2">
                                        Recipient Address
                                        <span className="text-[#9CA3AF] font-normal ml-1">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={withdrawRecipient}
                                        onChange={(e) => setWithdrawRecipient(e.target.value)}
                                        placeholder={address || '0x...'}
                                        className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#1A1D29] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                                    />
                                    <p className="text-xs text-[#9CA3AF] mt-2">
                                        Leave empty to withdraw to connected wallet
                                    </p>
                                </div>

                                <button
                                    onClick={handleWithdraw}
                                    disabled={withdrawing || !withdrawNote}
                                    className="w-full bg-[#6366F1] hover:bg-[#4F46E5] disabled:bg-[#D1D5DB] disabled:cursor-not-allowed text-white font-medium py-3.5 px-4 rounded-xl transition-all"
                                >
                                    {withdrawing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                            </svg>
                                            {status || 'Processing...'}
                                        </span>
                                    ) : 'Withdraw from Pool'}
                                </button>

                                <div className="bg-[#EDE9FE] rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-[#7C3AED] flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                                        </svg>
                                        <p className="text-sm text-[#5B21B6]">
                                            Withdrawal generates a ZK proof verifying you know a valid deposit without revealing which one.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Messages */}
                {status && !error && !success && (
                    <div className="mt-6 bg-[#DBEAFE] rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
                        <svg className="animate-spin h-5 w-5 text-[#2563EB]" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <p className="text-[#1E40AF] font-medium">{status}</p>
                    </div>
                )}

                {error && (
                    <div className="mt-6 bg-[#FEE2E2] rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
                        <svg className="w-5 h-5 text-[#DC2626] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                        </svg>
                        <p className="text-[#991B1B]">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mt-6 bg-[#D1FAE5] rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
                        <svg className="w-5 h-5 text-[#059669] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <p className="text-[#065F46]">{success}</p>
                    </div>
                )}

                {/* How it Works */}
                <div className="mt-8 bg-white rounded-2xl border border-[#E8EBF0] p-6">
                    <h3 className="font-semibold text-[#1A1D29] mb-4">How Shielded Pool Works</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
                                <span className="text-[#2563EB] font-bold text-sm">1</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-[#1A1D29] mb-1">Deposit</h4>
                                <p className="text-sm text-[#6B7280]">Your deposit creates a cryptographic commitment in the Merkle tree</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#EDE9FE] flex items-center justify-center flex-shrink-0">
                                <span className="text-[#7C3AED] font-bold text-sm">2</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-[#1A1D29] mb-1">ZK Proof</h4>
                                <p className="text-sm text-[#6B7280]">Generate proof you know a deposit without revealing which one</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                                <span className="text-[#059669] font-bold text-sm">3</span>
                            </div>
                            <div>
                                <h4 className="font-medium text-[#1A1D29] mb-1">Withdraw</h4>
                                <p className="text-sm text-[#6B7280]">Claim funds to any address with complete amount privacy</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
