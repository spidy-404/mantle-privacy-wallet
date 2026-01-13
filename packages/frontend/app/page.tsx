'use client';

import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { useKeysStore } from '@/lib/stores/keys-store';

export default function Home() {
    const hasKeys = useKeysStore((state) => state.hasKeys);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <Navigation />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold text-white mb-4">
                        Private Payments on Mantle
                    </h1>
                    <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                        Send and receive MNT and ERC-20 tokens privately using ERC-5564 stealth addresses.
                        Only you and your recipient can link payments to identities.
                    </p>

                    {!hasKeys ? (
                        <Link
                            href="/keys"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Get Started - Generate Keys
                        </Link>
                    ) : (
                        <div className="flex gap-4 justify-center">
                            <Link
                                href="/send"
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Send Payment
                            </Link>
                            <Link
                                href="/receive"
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-400 bg-gray-800 hover:bg-gray-700"
                            >
                                Receive Payments
                            </Link>
                        </div>
                    )}
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="text-3xl mb-4">🔒</div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Recipient Privacy
                        </h3>
                        <p className="text-gray-400 text-sm">
                            Each payment goes to a unique stealth address. Only the recipient can identify and access their funds.
                        </p>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="text-3xl mb-4">⚡</div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Non-Interactive
                        </h3>
                        <p className="text-gray-400 text-sm">
                            Send payments without coordinating with recipients. Just use their public meta-address.
                        </p>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="text-3xl mb-4">✅</div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            ERC-5564 Standard
                        </h3>
                        <p className="text-gray-400 text-sm">
                            Built on the official Ethereum standard for stealth addresses. Fully verifiable on-chain.
                        </p>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-6 border border-purple-700">
                        <div className="text-3xl mb-4">🛡️</div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Amount Privacy (ZK)
                        </h3>
                        <p className="text-gray-400 text-sm">
                            Hide transaction amounts using zero-knowledge proofs in the shielded pool.
                        </p>
                    </div>
                </div>

                {/* How it Works */}
                <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 mb-16">
                    <h2 className="text-3xl font-bold text-white mb-6">How It Works</h2>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                                1
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-1">Generate Your Keys</h4>
                                <p className="text-gray-400">
                                    Create viewing and spending keypairs. Your stealth meta-address is derived from these keys.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                                2
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-1">Share Your Meta-Address</h4>
                                <p className="text-gray-400">
                                    Give your stealth meta-address to anyone who wants to send you private payments.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                                3
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-1">Receive Private Payments</h4>
                                <p className="text-gray-400">
                                    Senders use your meta-address to generate unique stealth addresses for each payment.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                                4
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-1">Scan & Withdraw</h4>
                                <p className="text-gray-400">
                                    Scan the blockchain for announcements, derive your stealth private keys, and withdraw funds.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contract Info */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-4">Deployed Contracts</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Network:</span>
                            <span className="text-white font-mono">Mantle Sepolia Testnet</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Chain ID:</span>
                            <span className="text-white font-mono">5003</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">ERC5564Announcer:</span>
                            <a
                                href="https://sepolia.mantlescan.xyz/address/0x0B7BeA2BD729faD217127610e950F316559C16b6"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 font-mono text-xs"
                            >
                                0x0B7B...C16b6
                            </a>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">StealthPay:</span>
                            <a
                                href="https://sepolia.mantlescan.xyz/address/0x357dd5dc38A3cA13840250FC67D523A62720902f"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 font-mono text-xs"
                            >
                                0x357d...902f
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
