const hardhat = require("hardhat");
const { web3 } = require("hardhat");
const rlp = require('rlp')
const keccak = require("keccak");
const ethers = hardhat.ethers;


const SOLAR_ROUTER = "0xaa30ef758139ae4a7f798112902bf6d65612045f"

const TREASURY = "0x9E7e642DEA4a7C95F70CA3B6f1d15A416097517A";
const KEEPER = "0x821294D7F966167722c988e4865Ea1F61b2f4dD7";
const wMOVR = "0x98878B06940aE243284CA214f92Bb71a2b032B8A";
const OWNER = "0x821294D7F966167722c988e4865Ea1F61b2f4dD7";

// Tokens
const DAI = "0x80a16016cc4a2e6a2caca8a4a498b1699ff0f844";
const USDC = "0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d";
const MFAM = "0xBb8d88bcD9749636BC4D2bE22aaC4Bb3B01A58F1";
const FRAX = "0x1A93B23281CC1CDE4C4741353F3064709A16197d";
const USDT = "0xB44a9B6905aF7c801311e8F4E76932ee959c663C";
const ETH = "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C";

// mTokens
const want = "0xfb29918d393AaAa7dD118B51A8b7fCf862F5f336";
const mUSDC = "0xd0670AEe3698F66e2D4dAf071EB9c690d978BFA8";
const mUSDT = "0x36918B66F9A3eC7a59d0007D8458DB17bDffBF21";
const mFRAX = "0x93Ef8B7c6171BaB1C0A51092B2c9da8dc2ba0e9D";
const mBTC = "0x6E745367F4Ad2b3da7339aee65dC85d416614D90";
const mMOVR = "0x6a1A771C7826596652daDC9145fEAaE62b1cd07f";
const mETH = "0x6503D905338e2ebB550c9eC39Ced525b612E77aE";

const shouldVerifyOnEtherscan = true;

const vaultParams = {
  name: "Chewy Moonwell MOVR",
  symbol: "cwyMoonwellMOVR",
  delay: 21600,
};

const strategyParams = {
  markets: [mMOVR],
  borrowRate: 55,
  borrowRateMax: 60,
  borrowDepth: 4,
  minLeverage: 1000000000000,
  outputToNativeRoute: [MFAM, wMOVR],
  outputToWantRoute: [MFAM, wMOVR],
  unirouter: SOLAR_ROUTER,
  keeper: KEEPER,
  strategist: TREASURY,
  beefyFeeRecipient: TREASURY,
};

const contractNames = {
  vault: "BeefyVaultV6",
  strategy: "StrategyScream",
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

  console.log("Deploying:", vaultParams.symbol);

  const strategyConstructorArguments = [
    strategyParams.borrowRate,
    strategyParams.borrowRateMax,
    strategyParams.borrowDepth,
    strategyParams.minLeverage,
    strategyParams.outputToNativeRoute,
    strategyParams.outputToWantRoute,
    strategyParams.markets,
    vault.address,
    strategyParams.unirouter,
    strategyParams.keeper,
    strategyParams.strategist,
    strategyParams.beefyFeeRecipient,
  ];
  const strategy = await Strategy.deploy(...strategyConstructorArguments);
  await strategy.deployed();

  // add this info to PR
  console.log();
  console.log("Vault:", vault.address);
  console.log("Strategy:", strategy.address);
  console.log("Want:", strategyParams.outputToWantRoute[strategyParams.outputToWantRoute.length - 1]);

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
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });