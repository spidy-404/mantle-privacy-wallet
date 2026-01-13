'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Navigation() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="border-b border-gray-800 bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-white">
                                🔒 Mantle Privacy
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                href="/"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                    isActive('/')
                                        ? 'border-indigo-500 text-white'
                                        : 'border-transparent text-gray-300 hover:border-gray-600 hover:text-white'
                                }`}
                            >
                                Home
                            </Link>
                            <Link
                                href="/send"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                    isActive('/send')
                                        ? 'border-indigo-500 text-white'
                                        : 'border-transparent text-gray-300 hover:border-gray-600 hover:text-white'
                                }`}
                            >
                                Send
                            </Link>
                            <Link
                                href="/receive"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                    isActive('/receive')
                                        ? 'border-indigo-500 text-white'
                                        : 'border-transparent text-gray-300 hover:border-gray-600 hover:text-white'
                                }`}
                            >
                                Receive
                            </Link>
                            <Link
                                href="/keys"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                    isActive('/keys')
                                        ? 'border-indigo-500 text-white'
                                        : 'border-transparent text-gray-300 hover:border-gray-600 hover:text-white'
                                }`}
                            >
                                Keys
                            </Link>
                            <Link
                                href="/shield"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                    isActive('/shield')
                                        ? 'border-indigo-500 text-white'
                                        : 'border-transparent text-gray-300 hover:border-gray-600 hover:text-white'
                                }`}
                            >
                                Shield
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <ConnectButton />
                    </div>
                </div>
            </div>
        </nav>
    );
}
