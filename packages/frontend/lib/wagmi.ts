import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { defineChain } from 'viem';

/**
 * Mantle Sepolia Testnet configuration
 */
export const mantleSepolia = defineChain({
    id: 5003,
    name: 'Mantle Sepolia Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'Mantle',
        symbol: 'MNT',
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.sepolia.mantle.xyz'],
        },
        public: {
            http: ['https://rpc.sepolia.mantle.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Mantle Sepolia Explorer',
            url: 'https://sepolia.mantlescan.xyz',
        },
    },
    testnet: true,
});

/**
 * Deployed contract addresses on Mantle Sepolia
 */
export const CONTRACTS = {
    ERC5564Announcer: '0x0B7BeA2BD729faD217127610e950F316559C16b6' as `0x${string}`,
    StealthPay: '0x357dd5dc38A3cA13840250FC67D523A62720902f' as `0x${string}`,
} as const;

/**
 * Wagmi configuration for the application
 */
export const config = getDefaultConfig({
    appName: 'Mantle Privacy Wallet',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [mantleSepolia],
    transports: {
        [mantleSepolia.id]: http(),
    },
    ssr: true,
});
