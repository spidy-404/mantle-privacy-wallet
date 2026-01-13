pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

// Verifies a Merkle proof for a Poseidon tree
// Inputs:
//   - leaf: The leaf node to verify
//   - pathElements[levels]: The sibling nodes along the path
//   - pathIndices[levels]: The direction (0 = left, 1 = right) at each level
//   - root: The expected Merkle root
// Output:
//   - Constraint that computed root equals expected root
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal input root;

    component poseidons[levels];
    signal hashes[levels + 1];
    signal hashIsLeft[levels];
    signal hashIsRight[levels];
    signal siblingIsLeft[levels];
    signal siblingIsRight[levels];

    // Start with the leaf
    hashes[0] <== leaf;

    // Compute hash at each level
    for (var i = 0; i < levels; i++) {
        // Constrain pathIndices to be binary (0 or 1)
        pathIndices[i] * (pathIndices[i] - 1) === 0;

        // Selector logic: choose left and right inputs based on pathIndices[i]
        // When pathIndices[i] = 0: hash is left, sibling is right
        // When pathIndices[i] = 1: sibling is left, hash is right
        hashIsLeft[i] <== (1 - pathIndices[i]) * hashes[i];
        hashIsRight[i] <== pathIndices[i] * hashes[i];
        siblingIsLeft[i] <== pathIndices[i] * pathElements[i];
        siblingIsRight[i] <== (1 - pathIndices[i]) * pathElements[i];

        poseidons[i] = Poseidon(2);
        poseidons[i].inputs[0] <== hashIsLeft[i] + siblingIsLeft[i];
        poseidons[i].inputs[1] <== hashIsRight[i] + siblingIsRight[i];

        hashes[i + 1] <== poseidons[i].out;
    }

    // Verify the computed root matches the expected root
    root === hashes[levels];
}
