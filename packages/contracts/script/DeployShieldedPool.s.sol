// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {Groth16Verifier} from "../src/Groth16Verifier.sol";
import {ShieldedPool} from "../src/ShieldedPool.sol";

/**
 * @title DeployShieldedPool
 * @notice Deploys ShieldedPool after Poseidon contract is deployed
 * @dev Run with: forge script script/DeployShieldedPool.s.sol --rpc-url mantle_sepolia --broadcast
 * @dev Make sure POSEIDON_T3 address is updated in Poseidon.sol before running this
 */
contract DeployShieldedPool is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Groth16 Verifier
        Groth16Verifier verifier = new Groth16Verifier();
        console2.log("Groth16Verifier deployed at:", address(verifier));

        // Deploy ShieldedPool with verifier and denominations
        uint256[] memory denominations = new uint256[](3);
        denominations[0] = 0.1 ether;  // 0.1 MNT
        denominations[1] = 1 ether;    // 1 MNT
        denominations[2] = 10 ether;   // 10 MNT

        ShieldedPool shieldedPool = new ShieldedPool(address(verifier), denominations);
        console2.log("ShieldedPool deployed at:", address(shieldedPool));

        vm.stopBroadcast();

        // Log deployment summary
        console2.log("\n=== ShieldedPool Deployment Summary ===");
        console2.log("Groth16Verifier:", address(verifier));
        console2.log("ShieldedPool:", address(shieldedPool));
        console2.log("======================================\n");
        console2.log("Update frontend config with new ShieldedPool address!");
    }
}
