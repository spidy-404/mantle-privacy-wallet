// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ShieldedPool} from "../src/ShieldedPool.sol";
import {Groth16Verifier} from "../src/Groth16Verifier.sol";
import {PoseidonT4} from "../src/libraries/Poseidon.sol";

contract ShieldedPoolTest is Test {
    ShieldedPool public pool;
    Groth16Verifier public verifier;

    uint256 constant DENOMINATION_01 = 0.1 ether;
    uint256 constant DENOMINATION_1 = 1 ether;
    uint256 constant DENOMINATION_10 = 10 ether;

    address alice = address(0x1);
    address bob = address(0x2);

    event Deposit(uint256 indexed commitment, uint256 leafIndex, uint256 amount, uint256 timestamp);
    event Withdrawal(
        address indexed recipient, uint256 nullifierHash, uint256 amount, uint256 timestamp
    );

    function setUp() public {
        // Deploy verifier
        verifier = new Groth16Verifier();

        // Deploy pool with supported denominations
        uint256[] memory denoms = new uint256[](3);
        denoms[0] = DENOMINATION_01;
        denoms[1] = DENOMINATION_1;
        denoms[2] = DENOMINATION_10;

        pool = new ShieldedPool(address(verifier), denoms);

        // Fund test accounts
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function testDeployment() public view {
        assertEq(address(pool.verifier()), address(verifier));
        assertTrue(pool.denominations(DENOMINATION_01));
        assertTrue(pool.denominations(DENOMINATION_1));
        assertTrue(pool.denominations(DENOMINATION_10));
        assertFalse(pool.denominations(0.5 ether));
    }

    function testDeposit() public {
        // Generate a commitment (in practice, this would be Poseidon(secret, nullifier, amount))
        uint256 secret = 123456789;
        uint256 nullifier = 987654321;
        uint256 commitment =
            PoseidonT4.hash([secret, nullifier, DENOMINATION_1]);

        // Expect Deposit event
        vm.expectEmit(true, false, false, true);
        emit Deposit(commitment, 0, DENOMINATION_1, block.timestamp);

        // Alice deposits
        vm.prank(alice);
        pool.deposit{value: DENOMINATION_1}(commitment, DENOMINATION_1);

        // Check tree state
        assertEq(pool.getNextLeafIndex(), 1);
        assertTrue(pool.isKnownRoot(pool.getRoot()));
    }

    function testDepositMultiple() public {
        // Deposit 3 commitments
        for (uint256 i = 0; i < 3; i++) {
            uint256 commitment = PoseidonT4.hash([i, i + 1000, DENOMINATION_1]);

            vm.prank(alice);
            pool.deposit{value: DENOMINATION_1}(commitment, DENOMINATION_1);
        }

        assertEq(pool.getNextLeafIndex(), 3);
    }

    function testDepositRevertsInvalidDenomination() public {
        uint256 commitment = 12345;

        vm.prank(alice);
        vm.expectRevert(ShieldedPool.InvalidDenomination.selector);
        pool.deposit{value: 0.5 ether}(commitment, 0.5 ether);
    }

    function testDepositRevertsInvalidAmount() public {
        uint256 commitment = 12345;

        vm.prank(alice);
        vm.expectRevert(ShieldedPool.InvalidAmount.selector);
        pool.deposit{value: 0.5 ether}(commitment, DENOMINATION_1);
    }

    function testGetRoot() public {
        uint256 rootBefore = pool.getRoot();

        uint256 commitment = PoseidonT4.hash([1, 2, DENOMINATION_1]);

        vm.prank(alice);
        pool.deposit{value: DENOMINATION_1}(commitment, DENOMINATION_1);

        uint256 rootAfter = pool.getRoot();

        assertTrue(rootBefore != rootAfter);
        assertTrue(pool.isKnownRoot(rootAfter));
    }

    function testIsKnownRoot() public {
        // Initial root should be known
        uint256 root0 = pool.getRoot();
        assertTrue(pool.isKnownRoot(root0));

        // After deposit, new root should be known, old root still known
        uint256 commitment1 = PoseidonT4.hash([1, 2, DENOMINATION_1]);
        vm.prank(alice);
        pool.deposit{value: DENOMINATION_1}(commitment1, DENOMINATION_1);

        uint256 root1 = pool.getRoot();
        assertTrue(pool.isKnownRoot(root1));
        assertTrue(pool.isKnownRoot(root0));

        // Random root should not be known
        assertFalse(pool.isKnownRoot(999999));
    }

    function testNullifierNotUsedInitially() public {
        uint256 nullifierHash = 123456;
        assertFalse(pool.isNullifierUsed(nullifierHash));
    }

    // Note: Full withdraw testing requires generating valid ZK proofs
    // which is complex to do in Solidity tests. These would be tested
    // in integration tests with the SDK.
}
