// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleTree} from "./libraries/MerkleTree.sol";
import {PoseidonT4} from "./libraries/Poseidon.sol";

interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[4] calldata _pubSignals
    ) external view returns (bool);
}

/// @title ShieldedPool
/// @notice Privacy pool using ZK proofs for confidential withdrawals
/// @dev Users deposit with a commitment, withdraw with a ZK proof
contract ShieldedPool is ReentrancyGuard {
    using MerkleTree for MerkleTree.Tree;

    // Verifier contract for ZK proofs
    IGroth16Verifier public immutable verifier;

    // Merkle tree of commitments
    MerkleTree.Tree private tree;

    // Nullifier tracking to prevent double-spending
    mapping(uint256 => bool) public nullifiers;

    // Supported denomination amounts (in wei)
    mapping(uint256 => bool) public denominations;

    // Events
    event Deposit(uint256 indexed commitment, uint256 leafIndex, uint256 amount, uint256 timestamp);
    event Withdrawal(
        address indexed recipient, uint256 nullifierHash, uint256 amount, uint256 timestamp
    );

    // Errors
    error InvalidDenomination();
    error InvalidAmount();
    error NullifierAlreadyUsed();
    error InvalidMerkleRoot();
    error InvalidProof();
    error TransferFailed();
    error ZeroAddress();

    /// @notice Constructor
    /// @param _verifier Address of the Groth16 verifier contract
    /// @param _denominations Array of supported denomination amounts
    constructor(address _verifier, uint256[] memory _denominations) {
        if (_verifier == address(0)) revert ZeroAddress();

        verifier = IGroth16Verifier(_verifier);

        // Initialize Merkle tree with zero value
        tree.initialize(0);

        // Set supported denominations
        for (uint256 i = 0; i < _denominations.length; i++) {
            denominations[_denominations[i]] = true;
        }
    }

    /// @notice Deposit funds into the pool with a commitment
    /// @param commitment The Poseidon hash commitment (hash of secret, nullifier, amount)
    /// @param amount The denomination amount to deposit
    function deposit(uint256 commitment, uint256 amount) external payable nonReentrant {
        if (!denominations[amount]) revert InvalidDenomination();
        if (msg.value != amount) revert InvalidAmount();

        // Insert commitment into Merkle tree
        uint256 leafIndex = tree.insert(commitment);

        emit Deposit(commitment, leafIndex, amount, block.timestamp);
    }

    /// @notice Withdraw funds using a ZK proof
    /// @param proof The Groth16 proof (a, b, c components flattened)
    /// @param root The Merkle root
    /// @param nullifierHash The nullifier hash (to prevent double-spending)
    /// @param recipient The recipient address
    /// @param amount The amount to withdraw
    function withdraw(
        uint256[8] calldata proof,
        uint256 root,
        uint256 nullifierHash,
        address recipient,
        uint256 amount
    ) external nonReentrant {
        if (!denominations[amount]) revert InvalidDenomination();
        if (!tree.isKnownRoot(root)) revert InvalidMerkleRoot();
        if (nullifiers[nullifierHash]) revert NullifierAlreadyUsed();
        if (recipient == address(0)) revert ZeroAddress();

        // Verify the ZK proof
        // Public signals: [root, nullifierHash, recipient, amount]
        uint256[4] memory pubSignals = [root, nullifierHash, uint256(uint160(recipient)), amount];

        // Extract proof components (a, b, c)
        uint256[2] memory pA = [proof[0], proof[1]];
        uint256[2][2] memory pB = [[proof[2], proof[3]], [proof[4], proof[5]]];
        uint256[2] memory pC = [proof[6], proof[7]];

        bool isValidProof = verifier.verifyProof(pA, pB, pC, pubSignals);
        if (!isValidProof) revert InvalidProof();

        // Mark nullifier as used
        nullifiers[nullifierHash] = true;

        // Transfer funds to recipient
        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawal(recipient, nullifierHash, amount, block.timestamp);
    }

    /// @notice Get the current Merkle root
    /// @return The current root of the commitment tree
    function getRoot() external view returns (uint256) {
        return tree.getRoot();
    }

    /// @notice Get the next leaf index
    /// @return The index that will be assigned to the next deposit
    function getNextLeafIndex() external view returns (uint256) {
        return tree.getNextLeafIndex();
    }

    /// @notice Check if a Merkle root is known
    /// @param root The root to check
    /// @return True if the root is valid
    function isKnownRoot(uint256 root) external view returns (bool) {
        return tree.isKnownRoot(root);
    }

    /// @notice Check if a nullifier has been used
    /// @param nullifierHash The nullifier hash to check
    /// @return True if the nullifier has been used
    function isNullifierUsed(uint256 nullifierHash) external view returns (bool) {
        return nullifiers[nullifierHash];
    }
}
