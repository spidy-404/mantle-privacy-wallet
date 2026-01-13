// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC5564Announcer} from "./interfaces/IERC5564Announcer.sol";

/**
 * @title ERC5564Announcer
 * @notice Implements ERC-5564 stealth address announcement standard
 * @dev Singleton contract for emitting standardized Announcement events
 * @dev Deployed once and used by all stealth payment implementations on Mantle
 */
contract ERC5564Announcer is IERC5564Announcer {
    /// @notice Announce a stealth payment to the blockchain
    /// @inheritdoc IERC5564Announcer
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external {
        emit Announcement(schemeId, stealthAddress, msg.sender, ephemeralPubKey, metadata);
    }
}
