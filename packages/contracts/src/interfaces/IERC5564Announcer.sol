// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC5564Announcer
 * @notice Interface for announcing stealth address payments following ERC-5564 standard
 * @dev See https://eips.ethereum.org/EIPS/eip-5564
 */
interface IERC5564Announcer {
    /**
     * @notice Emitted when a payment to a stealth address is announced
     * @param schemeId Identifier of the stealth address scheme (e.g., 1 for secp256k1)
     * @param stealthAddress The recipient's one-time stealth address
     * @param caller The address that called the announce function
     * @param ephemeralPubKey The ephemeral public key used to derive the shared secret
     * @param metadata Encrypted data needed for the recipient to reconstruct keys
     */
    event Announcement(
        uint256 indexed schemeId,
        address indexed stealthAddress,
        address indexed caller,
        bytes ephemeralPubKey,
        bytes metadata
    );

    /**
     * @notice Announce a stealth payment
     * @dev Emits an Announcement event with all necessary data for the recipient
     * @param schemeId Identifier of the cryptographic scheme (1 = secp256k1)
     * @param stealthAddress The one-time address receiving the payment
     * @param ephemeralPubKey Ephemeral public key for shared secret derivation
     * @param metadata Additional encrypted data for key reconstruction
     */
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external;
}
