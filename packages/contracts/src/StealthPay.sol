// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC5564Announcer} from "./interfaces/IERC5564Announcer.sol";

/**
 * @title StealthPay
 * @notice Helper contract for sending MNT and ERC-20 tokens to stealth addresses
 * @dev Combines payment transfer with ERC-5564 announcement in a single transaction
 */
contract StealthPay is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The ERC5564Announcer contract used for posting announcements
    IERC5564Announcer public immutable announcer;

    /// @notice Emitted when a stealth payment is successfully sent
    /// @param stealthAddress The recipient stealth address
    /// @param asset The token address (address(0) for native MNT)
    /// @param amount The amount sent
    /// @param caller The address that sent the payment
    event StealthPayment(address indexed stealthAddress, address indexed asset, uint256 amount, address indexed caller);

    /// @notice Error thrown when sending native currency fails
    error TransferFailed();

    /// @notice Error thrown when zero amount is provided
    error ZeroAmount();

    /// @notice Error thrown when zero address is provided as stealth address
    error ZeroAddress();

    /**
     * @notice Constructor sets the announcer contract address
     * @param _announcer Address of the deployed ERC5564Announcer contract
     */
    constructor(address _announcer) {
        require(_announcer != address(0), "Invalid announcer address");
        announcer = IERC5564Announcer(_announcer);
    }

    /**
     * @notice Send native MNT to a stealth address
     * @dev Transfers msg.value to stealthAddress and announces the payment
     * @param schemeId The stealth address scheme identifier (1 for secp256k1)
     * @param stealthAddress The recipient's one-time stealth address
     * @param ephemeralPubKey Ephemeral public key for shared secret derivation
     * @param metadata Additional encrypted data for the recipient
     */
    function sendEtherStealth(
        uint256 schemeId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        if (stealthAddress == address(0)) revert ZeroAddress();

        // Transfer native MNT to stealth address
        (bool success,) = stealthAddress.call{value: msg.value}("");
        if (!success) revert TransferFailed();

        // Announce the payment
        announcer.announce(schemeId, stealthAddress, ephemeralPubKey, metadata);

        emit StealthPayment(stealthAddress, address(0), msg.value, msg.sender);
    }

    /**
     * @notice Send ERC-20 tokens to a stealth address
     * @dev Transfers tokens from msg.sender to stealthAddress and announces the payment
     * @dev Caller must approve this contract to spend the tokens first
     * @param schemeId The stealth address scheme identifier (1 for secp256k1)
     * @param token The ERC-20 token contract address
     * @param amount The amount of tokens to send
     * @param stealthAddress The recipient's one-time stealth address
     * @param ephemeralPubKey Ephemeral public key for shared secret derivation
     * @param metadata Additional encrypted data for the recipient
     */
    function sendTokenStealth(
        uint256 schemeId,
        address token,
        uint256 amount,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (stealthAddress == address(0)) revert ZeroAddress();
        if (token == address(0)) revert ZeroAddress();

        // Transfer tokens from sender to stealth address
        IERC20(token).safeTransferFrom(msg.sender, stealthAddress, amount);

        // Announce the payment
        announcer.announce(schemeId, stealthAddress, ephemeralPubKey, metadata);

        emit StealthPayment(stealthAddress, token, amount, msg.sender);
    }
}
