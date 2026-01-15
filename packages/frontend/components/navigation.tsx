'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// SVG Icons as components
const Logo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 12L16 8L24 12L16 16L8 12Z" fill="#6366F1"/>
        <path d="M8 12V20L16 24V16L8 12Z" fill="#818CF8"/>
        <path d="M24 12V20L16 24V16L24 12Z" fill="#4F46E5"/>
    </svg>
);

const HomeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 10L10 3L17 10M5 8V17H8V12H12V17H15V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 3L3 10L9 12M17 3L14 17L9 12M17 3L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ReceiveIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 3V14M10 14L6 10M10 14L14 10M4 17H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const KeyIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8C12 10.2091 10.2091 12 8 12C5.79086 12 4 10.2091 4 8C4 5.79086 5.79086 4 8 4C10.2091 4 12 5.79086 12 8Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M11 11L16 16M16 16V13M16 16H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ShieldIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2L3 5V10C3 14.42 6.11 18.51 10 19C13.89 18.51 17 14.42 17 10V5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const navItems = [
    { href: '/', label: 'Dashboard', icon: HomeIcon },
    { href: '/send', label: 'Send', icon: SendIcon },
    { href: '/receive', label: 'Receive', icon: ReceiveIcon },
    { href: '/keys', label: 'Keys', icon: KeyIcon },
    { href: '/shield', label: 'Shield', icon: ShieldIcon },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1A1D29] flex flex-col z-50">
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
                <Logo />
                <span className="text-white font-semibold text-lg">OBSCURA</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                        isActive
                                            ? 'bg-white/10 text-white'
                                            : 'text-[#8B8D97] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Icon />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Bottom section */}
            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-[#8B8D97] text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span>Mantle Sepolia</span>
                </div>
            </div>
        </aside>
    );
}

export function TopBar() {
    return (
        <header className="h-16 bg-white border-b border-[#E8EBF0] flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-semibold text-[#1A1D29]">
                    {/* Page title will be set by each page */}
                </h1>
            </div>
            <div className="flex items-center gap-4">
                <ConnectButton
                    showBalance={false}
                    chainStatus="icon"
                    accountStatus="address"
                />
            </div>
        </header>
    );
}

// Legacy Navigation component for backwards compatibility
export function Navigation() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="bg-white border-b border-[#E8EBF0]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="flex items-center gap-2">
                                <Logo />
                                <span className="text-lg font-semibold text-[#1A1D29]">
                                    OBSCURA
                                </span>
                            </Link>
                        </div>
                        <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`inline-flex items-center gap-2 px-4 py-2 my-2 rounded-lg text-sm font-medium transition-all ${
                                            isActive(item.href)
                                                ? 'bg-[#6366F1] text-white'
                                                : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1A1D29]'
                                        }`}
                                    >
                                        <Icon />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <ConnectButton
                            showBalance={false}
                            chainStatus="icon"
                            accountStatus="address"
                        />
                    </div>
                </div>
            </div>
        </nav>
    );
}
