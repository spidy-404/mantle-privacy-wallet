'use client';

import { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { Navigation } from '@/components/navigation';
import { CONTRACTS } from '@/lib/wagmi';
import { parseEther, formatEther } from 'viem';
import Link from 'next/link';
import {
    generateDepositNote,
    computeCommitment,
    generateWithdrawProof,
    proofToCalldata,
    createIndexerClient,
} from '@mantle-privacy/sdk';

const DENOMINATIONS = [
    { label: '0.1 MNT', value: '0.1' },
    { label: '1 MNT', value: '1' },
    { label: '10 MNT', value: '10' },
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

    // Withdraw form state
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

            // Generate deposit note
            const note = await generateDepositNote(BigInt(amount.toString()));

            // Deposit to pool
            const hash = await walletClient.writeContract({
                address: CONTRACTS.ShieldedPool,
                abi: SHIELDED_POOL_ABI,
                functionName: 'deposit',
                args: [BigInt(note.commitment), amount],
                value: amount,
            });

            console.log('Deposit tx:', hash);

            // Wait for confirmation
            await publicClient!.waitForTransactionReceipt({ hash });

            // Create note string
            const noteString = JSON.stringify(note, null, 2);
            setDepositNote(noteString);

            setSuccess(`Deposit successful! Save your note below to withdraw later.`);
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

            // Parse deposit note
            const note = JSON.parse(withdrawNote);
            const recipient = withdrawRecipient || address;

            // Create indexer client
            const indexer = createIndexerClient({
                apiUrl: process.env.NEXT_PUBLIC_INDEXER_API || 'https://indexer-mantle.onrender.com',
            });

            setStatus('Fetching Merkle path from indexer...');
            console.log('📡 Fetching Merkle path from indexer...');

            // Get Merkle path for this commitment
            const merklePath = await indexer.getMerklePath(note.commitment);

            console.log('✅ Merkle path retrieved:', merklePath);

            setStatus('Verifying Merkle root...');

            // Get current Merkle root from contract
            const contractRoot = await publicClient!.readContract({
                address: CONTRACTS.ShieldedPool,
                abi: SHIELDED_POOL_ABI,
                functionName: 'getRoot',
            });

            console.log('Contract root:', contractRoot);
            console.log('Merkle path root:', merklePath.root);

            // Verify roots match
            if (BigInt(merklePath.root) !== contractRoot) {
                setStatus('');
                setError('Merkle root mismatch. Tree may be out of sync. Please try again.');
                return;
            }

            console.log('✅ Merkle root verified!');

            // Circuit files hosted in public folder
            const CIRCUIT_WASM_URL = '/circuits/withdraw.wasm';
            const CIRCUIT_ZKEY_URL = '/circuits/withdraw.zkey';

            setStatus('Generating ZK proof... (30-60 seconds)');
            console.log('🔐 Generating ZK proof... (this may take 30-60 seconds)');

            // Generate ZK proof
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

            console.log('✅ ZK proof generated!', proof);

            // Convert proof to calldata format
            const calldata = proofToCalldata(proof);

            setStatus('Submitting withdrawal transaction...');
            console.log('📝 Submitting withdrawal transaction...');

            // Submit withdrawal transaction
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

            console.log('Withdrawal tx:', hash);
            setStatus('Waiting for confirmation...');

            // Try to wait for confirmation with retries
            try {
                await publicClient!.waitForTransactionReceipt({
                    hash,
                    timeout: 60_000, // 60 second timeout
                    pollingInterval: 2_000, // Poll every 2 seconds
                });
                setSuccess(`Withdrawal successful! ${formatEther(BigInt(note.amount))} MNT sent to ${recipient}. Transaction: ${hash}`);
            } catch (receiptError: any) {
                // Transaction was submitted but receipt not found yet - this is still a success
                console.log('Receipt not found immediately, but tx was submitted:', receiptError);
                setSuccess(`Withdrawal submitted! ${formatEther(BigInt(note.amount))} MNT should arrive at ${recipient} shortly. Transaction: ${hash}`);
            }
        } catch (err: any) {
            console.error('Withdraw error:', err);
            // Don't show TransactionReceiptNotFoundError as an error if tx was already submitted
            if (err?.name === 'TransactionReceiptNotFoundError') {
                setSuccess(`Withdrawal likely successful! Check your wallet for incoming funds.`);
            } else {
                setError(err?.message || 'Failed to withdraw');
            }
        } finally {
            setWithdrawing(false);
            setStatus('');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <Navigation />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Shielded Pool</h1>
                    <p className="text-gray-400">
                        Deposit and withdraw funds with zero-knowledge proofs for amount privacy
                    </p>
                </div>

                {!isConnected ? (
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                        <div className="text-5xl mb-4">🔗</div>
                        <h2 className="text-2xl font-semibold text-white mb-2">
                            Connect Your Wallet
                        </h2>
                        <p className="text-gray-400">
                            Please connect your wallet to use the shielded pool
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Deposit Section */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <h2 className="text-2xl font-semibold text-white mb-4">Deposit</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Select Amount
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {DENOMINATIONS.map((denom) => (
                                            <button
                                                key={denom.value}
                                                onClick={() => setSelectedDenomination(denom.value)}
                                                className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                                                    selectedDenomination === denom.value
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                                >
                                    {depositing ? 'Depositing...' : 'Deposit to Pool'}
                                </button>

                                {depositNote && (
                                    <div className="space-y-3">
                                        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                                            <p className="text-yellow-300 text-sm font-medium mb-2">
                                                ⚠️ Save Your Deposit Note!
                                            </p>
                                            <p className="text-yellow-200 text-xs">
                                                This note is required to withdraw your funds. Without
                                                it, your funds will be permanently locked!
                                            </p>
                                        </div>

                                        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                            <pre className="text-xs text-green-400 overflow-x-auto">
                                                {depositNote}
                                            </pre>
                                        </div>

                                        <button
                                            onClick={downloadNote}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                        >
                                            💾 Download Note
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Withdraw Section */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                            <h2 className="text-2xl font-semibold text-white mb-4">Withdraw</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Deposit Note (JSON)
                                    </label>
                                    <textarea
                                        value={withdrawNote}
                                        onChange={(e) => setWithdrawNote(e.target.value)}
                                        placeholder='{"secret":"...","nullifier":"...","commitment":"..."}'
                                        rows={6}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Recipient Address (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={withdrawRecipient}
                                        onChange={(e) => setWithdrawRecipient(e.target.value)}
                                        placeholder={address || '0x...'}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Leave empty to withdraw to your connected wallet
                                    </p>
                                </div>

                                <button
                                    onClick={handleWithdraw}
                                    disabled={withdrawing || !withdrawNote}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                                >
                                    {withdrawing ? 'Generating Proof...' : 'Withdraw from Pool'}
                                </button>

                                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                                    <p className="text-blue-300 text-sm">
                                        <strong>Note:</strong> Withdraw requires generating a
                                        zero-knowledge proof and computing the Merkle path. This will
                                        be fully functional once the indexer service is deployed.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status/Error/Success Messages */}
                {status && (
                    <div className="mt-6 bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 flex items-center gap-3">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                        <p className="text-blue-300 text-sm">{status}</p>
                    </div>
                )}

                {error && (
                    <div className="mt-6 bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mt-6 bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                        <p className="text-green-300 text-sm">{success}</p>
                    </div>
                )}

                {/* Info Box */}
                <div className="mt-6 bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                    <p className="text-purple-300 text-sm">
                        <strong>🛡️ How it works:</strong> Deposits are added to a Merkle tree with a
                        commitment hash. Withdrawals require a zero-knowledge proof that you know the
                        secret without revealing which deposit is yours. This provides amount privacy
                        beyond basic stealth addresses.
                    </p>
                </div>
            </main>
        </div>
    );
}
