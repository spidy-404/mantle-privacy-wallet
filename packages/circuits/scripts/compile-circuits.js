const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const CIRCUIT_NAME = 'withdraw';
const TREE_LEVELS = 20;
const CIRCUITS_DIR = path.join(__dirname, '../circuits');
const BUILD_DIR = path.join(__dirname, '../build');
const PTAU_FILE = path.join(BUILD_DIR, 'powersOfTau28_hez_final_14.ptau');

async function runCommand(command, description) {
    console.log(`\n📦 ${description}...`);
    try {
        const { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        console.log(`✅ ${description} complete`);
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.message);
        throw error;
    }
}

async function downloadPtau() {
    // Check if ptau file exists
    if (fs.existsSync(PTAU_FILE)) {
        console.log('✅ Powers of Tau file already exists');
        return;
    }

    console.log('\n📥 Downloading Powers of Tau file (this may take a few minutes)...');

    // Download using curl
    const ptauUrl = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau';
    await runCommand(
        `curl -o ${PTAU_FILE} ${ptauUrl}`,
        'Download Powers of Tau ceremony file'
    );
}

async function compileCircuit() {
    // Ensure build directory exists
    if (!fs.existsSync(BUILD_DIR)) {
        fs.mkdirSync(BUILD_DIR, { recursive: true });
    }

    const circuitPath = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}.circom`);
    const outputDir = BUILD_DIR;

    // Step 1: Compile circuit
    await runCommand(
        `circom ${circuitPath} --r1cs --wasm --sym -o ${outputDir}`,
        'Compile circuit'
    );

    // Step 2: Download Powers of Tau if needed
    await downloadPtau();

    // Step 3: Generate zkey (proving key)
    const r1csFile = path.join(BUILD_DIR, `${CIRCUIT_NAME}.r1cs`);
    const zkeyFile = path.join(BUILD_DIR, `${CIRCUIT_NAME}.zkey`);

    await runCommand(
        `snarkjs groth16 setup ${r1csFile} ${PTAU_FILE} ${zkeyFile}`,
        'Generate proving key'
    );

    // Step 4: Export verification key
    const vkeyFile = path.join(BUILD_DIR, `${CIRCUIT_NAME}_vkey.json`);
    await runCommand(
        `snarkjs zkey export verificationkey ${zkeyFile} ${vkeyFile}`,
        'Export verification key'
    );

    // Step 5: Export Solidity verifier
    const verifierFile = path.join(__dirname, '../../contracts/src/Groth16Verifier.sol');
    await runCommand(
        `snarkjs zkey export solidityverifier ${zkeyFile} ${verifierFile}`,
        'Export Solidity verifier'
    );

    // Step 6: Print circuit info
    await runCommand(
        `snarkjs r1cs info ${r1csFile}`,
        'Circuit info'
    );

    console.log('\n🎉 Circuit compilation complete!');
    console.log(`   - Circuit: ${circuitPath}`);
    console.log(`   - R1CS: ${r1csFile}`);
    console.log(`   - WASM: ${path.join(BUILD_DIR, CIRCUIT_NAME + '_js', CIRCUIT_NAME + '.wasm')}`);
    console.log(`   - Proving key: ${zkeyFile}`);
    console.log(`   - Verification key: ${vkeyFile}`);
    console.log(`   - Solidity verifier: ${verifierFile}`);
}

// Run compilation
compileCircuit()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Compilation failed:', error);
        process.exit(1);
    });
