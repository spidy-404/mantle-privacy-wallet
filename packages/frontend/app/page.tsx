'use client';

import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { useKeysStore } from '@/lib/stores/keys-store';
import { useAccount, useBalance } from 'wagmi';

export default function Home() {
    const hasKeys = useKeysStore((state) => state.hasKeys);
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });

    return (
        <div className="min-h-screen bg-[#F8F9FC]">
            <Navigation />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#1A1D29] mb-2">
                        Welcome to Obsucra wallet
                    </h1>
                    <p className="text-[#6B7280]">
                        Private payments on Mantle Network
                    </p>
                </div>

                {/* Balance Card */}
                <div className="bg-[#1A1D29] rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[#8B8D97] text-sm mb-1">Total Balance</p>
                            <p className="text-white text-4xl font-bold">
                                {isConnected && balance
                                    ? `${parseFloat(balance.formatted).toFixed(4)} MNT`
                                    : '0.00 MNT'
                                }
                            </p>
                            <p className="text-[#8B8D97] text-sm mt-1">
                                Mantle Sepolia Testnet
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                href="/send"
                                className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                            >
                                Send
                            </Link>
                            <Link
                                href="/receive"
                                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-5 py-2.5 rounded-xl font-medium transition-all"
                            >
                                Receive
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Link href="/send" className="bg-white rounded-2xl p-5 border border-[#E8EBF0] hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 4L3 11L10 14M20 4L17 21L10 14M20 4L10 14" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h3 className="font-semibold text-[#1A1D29] mb-1">Send Private</h3>
                        <p className="text-sm text-[#6B7280]">Send to stealth address</p>
                    </Link>

                    <Link href="/receive" className="bg-white rounded-2xl p-5 border border-[#E8EBF0] hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 4V17M12 17L7 12M12 17L17 12M5 20H19" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h3 className="font-semibold text-[#1A1D29] mb-1">Receive</h3>
                        <p className="text-sm text-[#6B7280]">Scan for payments</p>
                    </Link>

                    <Link href="/shield" className="bg-white rounded-2xl p-5 border border-[#E8EBF0] hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-[#EDE9FE] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 3L4 7V12C4 16.42 7.11 20.51 12 21C16.89 20.51 20 16.42 20 12V7L12 3Z" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M9 12L11 14L15 10" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h3 className="font-semibold text-[#1A1D29] mb-1">Shield Pool</h3>
                        <p className="text-sm text-[#6B7280]">ZK amount privacy</p>
                    </Link>

                    <Link href="/keys" className="bg-white rounded-2xl p-5 border border-[#E8EBF0] hover:shadow-md transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 9C15 11.2091 13.2091 13 11 13C8.79086 13 7 11.2091 7 9C7 6.79086 8.79086 5 11 5C13.2091 5 15 6.79086 15 9Z" stroke="#D97706" strokeWidth="2"/>
                                <path d="M14 12L19 17M19 17V14M19 17H16" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <h3 className="font-semibold text-[#1A1D29] mb-1">Manage Keys</h3>
                        <p className="text-sm text-[#6B7280]">{hasKeys ? 'View your keys' : 'Generate keys'}</p>
                    </Link>
                </div>

                {/* How it Works */}
                <div className="bg-white rounded-2xl p-6 border border-[#E8EBF0] mb-8">
                    <h2 className="text-xl font-bold text-[#1A1D29] mb-6">How It Works</h2>

                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-[#6366F1] text-white flex items-center justify-center font-bold text-sm mb-3">
                                1
                            </div>
                            <h4 className="font-semibold text-[#1A1D29] mb-1">Generate Keys</h4>
                            <p className="text-sm text-[#6B7280]">Create viewing and spending keypairs for privacy</p>
                        </div>

                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-[#6366F1] text-white flex items-center justify-center font-bold text-sm mb-3">
                                2
                            </div>
                            <h4 className="font-semibold text-[#1A1D29] mb-1">Share Meta-Address</h4>
                            <p className="text-sm text-[#6B7280]">Give your public meta-address to receive payments</p>
                        </div>

                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-[#6366F1] text-white flex items-center justify-center font-bold text-sm mb-3">
                                3
                            </div>
                            <h4 className="font-semibold text-[#1A1D29] mb-1">Receive Privately</h4>
                            <p className="text-sm text-[#6B7280]">Each payment goes to a unique stealth address</p>
                        </div>

                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-[#6366F1] text-white flex items-center justify-center font-bold text-sm mb-3">
                                4
                            </div>
                            <h4 className="font-semibold text-[#1A1D29] mb-1">Scan & Withdraw</h4>
                            <p className="text-sm text-[#6B7280]">Find your payments and withdraw to any address</p>
                        </div>
                    </div>
                </div>

                {/* Features Row */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-[#E8EBF0]">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-[#FFE4E6] flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 2V5M10 15V18M18 10H15M5 10H2M15.66 15.66L13.54 13.54M6.46 6.46L4.34 4.34M15.66 4.34L13.54 6.46M6.46 13.54L4.34 15.66" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <h3 className="font-semibold text-[#1A1D29]">Recipient Privacy</h3>
                        </div>
                        <p className="text-sm text-[#6B7280]">
                            No one can link payments to your identity
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-[#E8EBF0]">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 2L12.4 7.2L18 8L14 12L15 18L10 15L5 18L6 12L2 8L7.6 7.2L10 2Z" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h3 className="font-semibold text-[#1A1D29]">ERC-5564 Standard</h3>
                        </div>
                        <p className="text-sm text-[#6B7280]">
                            Built on official Ethereum standard
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-[#E8EBF0]">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-[#D1FAE5] flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M16 8V6C16 3.79 14.21 2 12 2H8C5.79 2 4 3.79 4 6V8M2 10C2 8.9 2.9 8 4 8H16C17.1 8 18 8.9 18 10V16C18 17.1 17.1 18 16 18H4C2.9 18 2 17.1 2 16V10Z" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/>
                                    <circle cx="10" cy="13" r="2" stroke="#059669" strokeWidth="1.5"/>
                                </svg>
                            </div>
                            <h3 className="font-semibold text-[#1A1D29]">ZK Amount Privacy</h3>
                        </div>
                        <p className="text-sm text-[#6B7280]">
                            Hide amounts with zero-knowledge proofs
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
