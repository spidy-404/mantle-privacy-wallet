// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {ERC5564Announcer} from "../src/ERC5564Announcer.sol";
import {StealthPay} from "../src/StealthPay.sol";
import {Groth16Verifier} from "../src/Groth16Verifier.sol";
import {ShieldedPool} from "../src/ShieldedPool.sol";

/**
 * @title Deploy
 * @notice Deployment script for Mantle Privacy Wallet contracts
 * @dev Run with: forge script script/Deploy.s.sol --rpc-url mantle_sepolia --broadcast --verify
 */
contract Deploy is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ERC5564Announcer
        ERC5564Announcer announcer = new ERC5564Announcer();
        console2.log("ERC5564Announcer deployed at:", address(announcer));

        // 2. Deploy StealthPay with announcer address
        StealthPay stealthPay = new StealthPay(address(announcer));
        console2.log("StealthPay deployed at:", address(stealthPay));

        // 3. Deploy Groth16 Verifier
        Groth16Verifier verifier = new Groth16Verifier();
        console2.log("Groth16Verifier deployed at:", address(verifier));

        // 4. Deploy ShieldedPool with verifier and denominations
        uint256[] memory denominations = new uint256[](3);
        denominations[0] = 0.1 ether;  // 0.1 MNT
        denominations[1] = 1 ether;    // 1 MNT
        denominations[2] = 10 ether;   // 10 MNT

        ShieldedPool shieldedPool = new ShieldedPool(address(verifier), denominations);
        console2.log("ShieldedPool deployed at:", address(shieldedPool));

        vm.stopBroadcast();

        // Log deployment summary
        console2.log("\n=== Deployment Summary ===");
        console2.log("Network: Mantle Sepolia Testnet");
        console2.log("ERC5564Announcer:", address(announcer));
        console2.log("StealthPay:", address(stealthPay));
        console2.log("Groth16Verifier:", address(verifier));
        console2.log("ShieldedPool:", address(shieldedPool));
        console2.log("========================\n");
    }
}
