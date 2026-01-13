// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {ERC5564Announcer} from "../src/ERC5564Announcer.sol";
import {IERC5564Announcer} from "../src/interfaces/IERC5564Announcer.sol";

contract ERC5564AnnouncerTest is Test {
    ERC5564Announcer public announcer;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public stealthAddress = makeAddr("stealth");

    event Announcement(
        uint256 indexed schemeId,
        address indexed stealthAddress,
        address indexed caller,
        bytes ephemeralPubKey,
        bytes metadata
    );

    function setUp() public {
        announcer = new ERC5564Announcer();
    }

    function test_Announce() public {
        uint256 schemeId = 1; // secp256k1
        bytes memory ephemeralPubKey = hex"0123456789abcdef";
        bytes memory metadata = hex"deadbeef";

        vm.prank(alice);

        // Expect the Announcement event
        vm.expectEmit(true, true, true, true);
        emit Announcement(schemeId, stealthAddress, alice, ephemeralPubKey, metadata);

        announcer.announce(schemeId, stealthAddress, ephemeralPubKey, metadata);
    }

    function test_AnnounceMultipleTimes() public {
        uint256 schemeId = 1;
        bytes memory ephemeralPubKey1 = hex"0123456789abcdef";
        bytes memory metadata1 = hex"deadbeef";
        bytes memory ephemeralPubKey2 = hex"fedcba9876543210";
        bytes memory metadata2 = hex"beefdead";

        vm.startPrank(alice);

        // First announcement
        vm.expectEmit(true, true, true, true);
        emit Announcement(schemeId, stealthAddress, alice, ephemeralPubKey1, metadata1);
        announcer.announce(schemeId, stealthAddress, ephemeralPubKey1, metadata1);

        // Second announcement
        vm.expectEmit(true, true, true, true);
        emit Announcement(schemeId, stealthAddress, alice, ephemeralPubKey2, metadata2);
        announcer.announce(schemeId, stealthAddress, ephemeralPubKey2, metadata2);

        vm.stopPrank();
    }

    function test_AnnounceFromDifferentCallers() public {
        uint256 schemeId = 1;
        bytes memory ephemeralPubKey = hex"0123456789abcdef";
        bytes memory metadata = hex"deadbeef";

        // Announcement from alice
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit Announcement(schemeId, stealthAddress, alice, ephemeralPubKey, metadata);
        announcer.announce(schemeId, stealthAddress, ephemeralPubKey, metadata);

        // Announcement from bob
        vm.prank(bob);
        vm.expectEmit(true, true, true, true);
        emit Announcement(schemeId, stealthAddress, bob, ephemeralPubKey, metadata);
        announcer.announce(schemeId, stealthAddress, ephemeralPubKey, metadata);
    }

    function test_AnnounceDifferentSchemeIds() public {
        bytes memory ephemeralPubKey = hex"0123456789abcdef";
        bytes memory metadata = hex"deadbeef";

        vm.startPrank(alice);

        // Test different scheme IDs
        for (uint256 i = 1; i <= 5; i++) {
            vm.expectEmit(true, true, true, true);
            emit Announcement(i, stealthAddress, alice, ephemeralPubKey, metadata);
            announcer.announce(i, stealthAddress, ephemeralPubKey, metadata);
        }

        vm.stopPrank();
    }

    function test_AnnounceWithEmptyData() public {
        uint256 schemeId = 1;
        bytes memory ephemeralPubKey = hex"0123456789abcdef";
        bytes memory emptyMetadata = "";

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit Announcement(schemeId, stealthAddress, alice, ephemeralPubKey, emptyMetadata);
        announcer.announce(schemeId, stealthAddress, ephemeralPubKey, emptyMetadata);
    }

    function testFuzz_Announce(
        uint256 schemeId,
        address _stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) public {
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit Announcement(schemeId, _stealthAddress, alice, ephemeralPubKey, metadata);
        announcer.announce(schemeId, _stealthAddress, ephemeralPubKey, metadata);
    }

    function test_InterfaceSupport() public view {
        // Verify contract implements IERC5564Announcer
        IERC5564Announcer iface = IERC5564Announcer(address(announcer));
        assertEq(address(iface), address(announcer));
    }
}
