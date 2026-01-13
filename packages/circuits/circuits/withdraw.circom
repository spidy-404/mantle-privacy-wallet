pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "./merkle-proof.circom";

// Withdraw circuit for shielded pool
// Proves knowledge of:
//   - A secret and nullifier that hash to a commitment in the Merkle tree
//   - The nullifier to prevent double-spending
//
// Private inputs:
//   - secret: Random value chosen at deposit
//   - nullifier: Random value chosen at deposit
//   - pathElements[levels]: Merkle proof siblings
//   - pathIndices[levels]: Merkle proof directions
//
// Public inputs:
//   - root: Current Merkle root
//   - nullifierHash: Hash of nullifier (to mark as spent)
//   - recipient: Ethereum address to receive funds
//   - amount: Amount to withdraw (in wei)
template Withdraw(levels) {
    // Private inputs
    signal input secret;
    signal input nullifier;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // Public inputs
    signal input root;
    signal input nullifierHash;
    signal input recipient;
    signal input amount;

    // Compute commitment = Poseidon(secret, nullifier, amount)
    component commitmentHasher = Poseidon(3);
    commitmentHasher.inputs[0] <== secret;
    commitmentHasher.inputs[1] <== nullifier;
    commitmentHasher.inputs[2] <== amount;

    // Verify Merkle proof
    component merkleChecker = MerkleTreeChecker(levels);
    merkleChecker.leaf <== commitmentHasher.out;
    for (var i = 0; i < levels; i++) {
        merkleChecker.pathElements[i] <== pathElements[i];
        merkleChecker.pathIndices[i] <== pathIndices[i];
    }
    merkleChecker.root <== root;

    // Compute nullifier hash = Poseidon(nullifier)
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;

    // Verify nullifier hash matches public input
    nullifierHash === nullifierHasher.out;

    // Add recipient as a signal squared to prevent tampering
    // (This is a common pattern in ZK circuits to ensure the value is used)
    signal recipientSquared;
    recipientSquared <== recipient * recipient;
}

// Main component with tree depth of 20 (supports 1M deposits)
component main {public [root, nullifierHash, recipient, amount]} = Withdraw(20);
