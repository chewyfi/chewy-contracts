const hardhat = require("hardhat");
const { web3 } = require("hardhat");
const rlp = require('rlp')
const keccak = require("keccak");
const ethers = hardhat.ethers;


const SOLAR_DISTRIBUTOR = "0x0329867a8c457e9F75e25b0685011291CD30904F"
const SOLAR_ROUTER = "0xaa30ef758139ae4a7f798112902bf6d65612045f"
const SOLAR = "0x6bD193Ee6D2104F14F94E2cA6efefae561A4334B";

const TREASURY = "0x9E7e642DEA4a7C95F70CA3B6f1d15A416097517A";
const KEEPER = "0x821294D7F966167722c988e4865Ea1F61b2f4dD7";
const wMOVR = "0x98878B06940aE243284CA214f92Bb71a2b032B8A";
const OWNER = "0x821294D7F966167722c988e4865Ea1F61b2f4dD7";

// Tokens
const DAI = "0x80a16016cc4a2e6a2caca8a4a498b1699ff0f844";
const USDC = "0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d";
const FRAX = "0x1a93b23281cc1cde4c4741353f3064709a16197d";
const LDO = "0x6ccf12b480a99c54b23647c995f4525d544a7e72";
const xcKSM = "0xffffffff1fcacbd218edc0eba20fc2308c778080";

const shouldVerifyOnEtherscan = true;

const want = "0x493147C85Fe43F7B056087a6023dF32980Bcb2D1";
const SWAPPER = "0x77D4b212770A7cA26ee70b1E0f27fC36da191c53";
const poolId = 13

const vaultParams = {
  name: "Chewy SolarBeam stKSM Pool",
  symbol: "cwySolarbeamStKsmPool",
  delay: 21600,
};

const strategyParams = {
  want: want,
  poolId: poolId,
  chef: SOLAR_DISTRIBUTOR,
  swapper: SWAPPER,
  unirouter: SOLAR_ROUTER,
  strategist: TREASURY,
  keeper: KEEPER,
  beefyFeeRecipient: TREASURY,
  outputToNativeRoute: [SOLAR, wMOVR],
  outputToSwapRoute: [SOLAR, wMOVR, xcKSM],
};

const contractNames = {
  vault: "BeefyVaultV6",
  strategy: "StrategySolarbeamFarm",
};

const verifyContract = async (address, constructorArguments) => {
  return hardhat.run("verify:verify", {
    address,
    constructorArguments,
  });
};

const predictAddresses = async (creator) => {
  let currentNonce = await web3.eth.getTransactionCount(creator);
  let currentNonceHex = `0x${currentNonce.toString(16)}`;
  let currentInputArr = [creator, currentNonceHex];
  let currentRlpEncoded = rlp.encode(currentInputArr);
  let currentContractAddressLong = keccak("keccak256").update(currentRlpEncoded).digest("hex");
  let currentContractAddress = `0x${currentContractAddressLong.substring(24)}`;
  let currentContractAddressChecksum = web3.utils.toChecksumAddress(currentContractAddress);

  let nextNonce = currentNonce + 1;
  let nextNonceHex = `0x${nextNonce.toString(16)}`;
  let nextInputArr = [creator, nextNonceHex];
  let nextRlpEncoded = rlp.encode(nextInputArr);
  let nextContractAddressLong = keccak("keccak256").update(nextRlpEncoded).digest("hex");
  let nextContractAddress = `0x${nextContractAddressLong.substring(24)}`;
  let nextContractAddressChecksum = web3.utils.toChecksumAddress(nextContractAddress);

  return {
    vault: currentContractAddressChecksum,
    strategy: nextContractAddressChecksum,
  };
};

async function main() {
  if (
    Object.values(vaultParams).some(v => v === undefined) ||
    Object.values(strategyParams).some(v => v === undefined) ||
    Object.values(contractNames).some(v => v === undefined)
  ) {
    console.error("one of config values undefined");
    return;
  }

  await hardhat.run("compile");

  const Vault = await ethers.getContractFactory(contractNames.vault);
  const Strategy = await ethers.getContractFactory(contractNames.strategy);

  const [deployer] = await ethers.getSigners();

  console.log("Deploying:", vaultParams.name);

  const predictedAddresses = await predictAddresses(deployer.address);

  const vaultConstructorArguments = [
    predictedAddresses.strategy,
    vaultParams.name,
    vaultParams.symbol,
    vaultParams.delay,
  ];
  const vault = await Vault.deploy(...vaultConstructorArguments);
  await vault.deployed();

  console.log("Deploying Strategy");

  const strategyConstructorArguments = [
    strategyParams.want,
    strategyParams.poolId,
    strategyParams.chef,
    strategyParams.swapper,
    vault.address,
    strategyParams.unirouter,
    strategyParams.keeper,
    strategyParams.strategist,
    strategyParams.beefyFeeRecipient,
    strategyParams.outputToNativeRoute,
    strategyParams.outputToSwapRoute,
  ];
  const strategy = await Strategy.deploy(...strategyConstructorArguments);
  await strategy.deployed();

  // add this info to PR
  console.log();
  console.log("Vault:", vault.address);
  console.log("Strategy:", strategy.address);
  console.log("Want:", strategyParams.want);
  console.log("PoolId:", strategyParams.poolId);

  console.log();
  console.log("Running post deployment");

  const verifyContractsPromises = [];
  if (shouldVerifyOnEtherscan) {
    // skip await as this is a long running operation, and you can do other stuff to prepare vault while this finishes
    verifyContractsPromises.push(
      verifyContract(vault.address, vaultConstructorArguments),
      verifyContract(strategy.address, strategyConstructorArguments)
    );
  }

  await Promise.all(verifyContractsPromises);

  console.log(`Transfering Vault Owner to ${OWNER}`)
  await vault.transferOwnership(OWNER);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });