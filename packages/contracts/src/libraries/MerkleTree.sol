// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PoseidonT3} from "./Poseidon.sol";

/// @title MerkleTree
/// @notice Incremental Merkle tree implementation using Poseidon hash
/// @dev Optimized for ZK circuits - tree depth of 20 supports 1M deposits
library MerkleTree {
    uint256 public constant TREE_DEPTH = 20;
    uint256 public constant MAX_LEAVES = 2 ** TREE_DEPTH; // 1,048,576 leaves

    struct Tree {
        uint256 nextLeafIndex;
        mapping(uint256 => uint256) filledSubtrees;
        mapping(uint256 => uint256) roots;
        uint256 currentRootIndex;
    }

    /// @notice Initialize a new Merkle tree with zero hashes
    /// @param self The tree storage
    /// @param zeroValue The value to use for empty leaves
    function initialize(Tree storage self, uint256 zeroValue) internal {
        // Precompute zero hashes for each level
        uint256 currentZeroValue = zeroValue;

        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            self.filledSubtrees[i] = currentZeroValue;
            currentZeroValue = hashLeftRight(currentZeroValue, currentZeroValue);
        }

        self.roots[0] = currentZeroValue; // Store the initial root
        self.currentRootIndex = 0;
    }

    /// @notice Insert a new leaf into the tree
    /// @param self The tree storage
    /// @param leaf The leaf value to insert
    /// @return leafIndex The index of the inserted leaf
    function insert(Tree storage self, uint256 leaf) internal returns (uint256) {
        uint256 leafIndex = self.nextLeafIndex;
        require(leafIndex < MAX_LEAVES, "MerkleTree: tree is full");

        uint256 currentIndex = leafIndex;
        uint256 currentLevelHash = leaf;
        uint256 left;
        uint256 right;

        // Update filled subtrees and compute new root
        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            if (currentIndex % 2 == 0) {
                left = currentLevelHash;
                right = self.filledSubtrees[i];
                self.filledSubtrees[i] = currentLevelHash;
            } else {
                left = self.filledSubtrees[i];
                right = currentLevelHash;
            }

            currentLevelHash = hashLeftRight(left, right);
            currentIndex /= 2;
        }

        // Store the new root
        self.currentRootIndex++;
        self.roots[self.currentRootIndex] = currentLevelHash;
        self.nextLeafIndex++;

        return leafIndex;
    }

    /// @notice Check if a root is known (has been a valid root)
    /// @param self The tree storage
    /// @param root The root to check
    /// @return True if the root is known
    function isKnownRoot(Tree storage self, uint256 root) internal view returns (bool) {
        if (root == 0) return false;

        // Check last 100 roots for validity (protects against old roots)
        uint256 currentIndex = self.currentRootIndex;
        uint256 minIndex = currentIndex > 100 ? currentIndex - 100 : 0;

        for (uint256 i = currentIndex; i >= minIndex; i--) {
            if (self.roots[i] == root) {
                return true;
            }
            if (i == 0) break; // Prevent underflow
        }

        return false;
    }

    /// @notice Get the current root of the tree
    /// @param self The tree storage
    /// @return The current Merkle root
    function getRoot(Tree storage self) internal view returns (uint256) {
        return self.roots[self.currentRootIndex];
    }

    /// @notice Get the next leaf index
    /// @param self The tree storage
    /// @return The index that will be assigned to the next inserted leaf
    function getNextLeafIndex(Tree storage self) internal view returns (uint256) {
        return self.nextLeafIndex;
    }

    /// @notice Hash two child nodes using Poseidon
    /// @param left The left child
    /// @param right The right child
    /// @return The Poseidon hash of the two children
    function hashLeftRight(uint256 left, uint256 right) internal view returns (uint256) {
        return PoseidonT3.hash([left, right]);
    }
}
