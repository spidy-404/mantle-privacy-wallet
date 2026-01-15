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
    ERC5564Announcer: '0x53aCb6c2C0f12A748DB84fbA00bf29d66b3B5259' as `0x${string}`,
    StealthPay: '0x8370a0f6070A22189CfA5259dF16eF5123b29691' as `0x${string}`,
    Groth16Verifier: '0x7B2d12C6455F6bdD9Cdd97e57e6ECbF2aD1efaB6' as `0x${string}`,
    ShieldedPool: '0xc6277cF453bE422e6BC04D4ff171840069c845f2' as `0x${string}`,
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
