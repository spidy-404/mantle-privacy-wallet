import { groth16, type Groth16Proof } from 'snarkjs';

export interface WithdrawInput {
    // Private inputs
    secret: string;
    nullifier: string;
    pathElements: string[];
    pathIndices: number[];

    // Public inputs
    root: string;
    nullifierHash: string;
    recipient: string;
    amount: string;
    [key: string]: any; // Index signature for snarkjs compatibility
}

export interface Proof {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
    publicSignals: string[];
}

export interface ProofCalldata {
    proof: string[];
    publicSignals: string[];
}

/**
 * Generate a ZK proof for withdrawal
 * @param input The witness input
 * @param wasmPath Path to the circuit WASM file
 * @param zkeyPath Path to the proving key file
 * @returns The generated proof
 */
export async function generateWithdrawProof(
    input: WithdrawInput,
    wasmPath: string,
    zkeyPath: string
): Promise<Proof> {
    try {
        // Generate the proof
        const { proof, publicSignals } = await groth16.fullProve(
            input,
            wasmPath,
            zkeyPath
        );

        return {
            a: [proof.pi_a[0], proof.pi_a[1]],
            b: [
                [proof.pi_b[0][1], proof.pi_b[0][0]],
                [proof.pi_b[1][1], proof.pi_b[1][0]],
            ],
            c: [proof.pi_c[0], proof.pi_c[1]],
            publicSignals: publicSignals,
        };
    } catch (error) {
        throw new Error(`Failed to generate proof: ${error}`);
    }
}

/**
 * Convert proof to calldata format for contract calls
 * @param proof The proof object
 * @returns Flattened proof array and public signals
 */
export function proofToCalldata(proof: Proof): ProofCalldata {
    const flatProof = [
        proof.a[0],
        proof.a[1],
        proof.b[0][0],
        proof.b[0][1],
        proof.b[1][0],
        proof.b[1][1],
        proof.c[0],
        proof.c[1],
    ];

    return {
        proof: flatProof,
        publicSignals: proof.publicSignals,
    };
}

/**
 * Verify a proof (useful for testing before submitting)
 * @param proof The proof to verify
 * @param vkeyPath Path to the verification key file
 * @returns True if the proof is valid
 */
export async function verifyProof(proof: Proof, vkeyPath: string): Promise<boolean> {
    try {
        // Load verification key
        const vkey = require(vkeyPath);

        // Convert to Groth16Proof format
        const groth16Proof: Groth16Proof = {
            pi_a: [proof.a[0], proof.a[1], '1'],
            pi_b: [
                [proof.b[0][1], proof.b[0][0], '1'],
                [proof.b[1][1], proof.b[1][0], '1'],
            ],
            pi_c: [proof.c[0], proof.c[1], '1'],
            protocol: 'groth16',
            curve: 'bn128',
        };

        // Verify the proof
        const isValid = await groth16.verify(vkey, proof.publicSignals, groth16Proof);

        return isValid;
    } catch (error) {
        throw new Error(`Failed to verify proof: ${error}`);
    }
}

/**
 * Compute commitment hash: Poseidon(secret, nullifier, amount)
 * @param secret The secret value
 * @param nullifier The nullifier value
 * @param amount The amount value
 * @returns The commitment hash
 */
export function computeCommitment(
    secret: bigint,
    nullifier: bigint,
    amount: bigint
): bigint {
    // Import poseidon from circomlibjs
    const poseidon = require('circomlibjs').poseidon;
    return poseidon([secret, nullifier, amount]);
}

/**
 * Compute nullifier hash: Poseidon(nullifier)
 * @param nullifier The nullifier value
 * @returns The nullifier hash
 */
export function computeNullifierHash(nullifier: bigint): bigint {
    const poseidon = require('circomlibjs').poseidon;
    return poseidon([nullifier]);
}

/**
 * Generate random field element
 * @returns Random value in the field
 */
export function randomFieldElement(): bigint {
    const crypto = globalThis.crypto || require('crypto');
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    // Convert to bigint and mod by field size
    const FIELD_SIZE =
        21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    let value = 0n;
    for (let i = 0; i < bytes.length; i++) {
        value = (value << 8n) | BigInt(bytes[i]);
    }

    return value % FIELD_SIZE;
}

/**
 * Generate a deposit note
 * @param amount The amount to deposit
 * @returns Deposit note with secret, nullifier, and commitment
 */
export function generateDepositNote(amount: bigint) {
    const secret = randomFieldElement();
    const nullifier = randomFieldElement();
    const commitment = computeCommitment(secret, nullifier, amount);
    const nullifierHash = computeNullifierHash(nullifier);

    return {
        secret: secret.toString(),
        nullifier: nullifier.toString(),
        commitment: commitment.toString(),
        nullifierHash: nullifierHash.toString(),
        amount: amount.toString(),
    };
}
