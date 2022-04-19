const hardhat = require("hardhat");
const { web3 } = require("hardhat");
const rlp = require('rlp')
const keccak = require("keccak");
const ethers = hardhat.ethers;


const ROUTER = "0x06C04B0AD236e7Ca3B3189b1d049FE80109C7977"
const CHEF = "0xDD03CDF71a3D908F02D7676A9F0576275D7F70F2";
const BEAST = "0x07E6158bE70e217C7db73522F01e243296b66663";

const TREASURY = "0x9E23d450F4AFB829d3AeEFeA64fc95374658B883";
const KEEPER = "0x821294D7F966167722c988e4865Ea1F61b2f4dD7";
const wNative = "0xAeaaf0e2c81Af264101B9129C00F4440cCF0F720";
const OWNER = "0x821294D7F966167722c988e4865Ea1F61b2f4dD7";

// Tokens
const USDC = "0x6a2d262D56735DbA19Dd70682B39F6bE9a931D98";
const USDT = "0x3795C36e7D12A8c252A20C5a7B455f7c57b60283";
const WETH = "0x81ECac0D6Be0550A00FF064a4f9dd2400585FE9c";
const WBTC = "0xad543f18cFf85c77E140E3E5E3c3392f6Ba9d5CA";

const shouldVerifyOnEtherscan = false;

const want = "0xC4ba558D1700b156a3511F112dFF8b86D108DEE9";

const vaultParams = {
  name: "Chewy FunBeast wastar-usdc",
  symbol: "cwyAstarUsdc",
  delay: 21600,
};

// CHECKLIST:
// 1- Change routes
// 2- Change poolId
// 3- Change want
// 4- Change contract names
const strategyParams = {
  want,
  poolId: 7,
  chef: CHEF,
  unirouter: ROUTER,
  strategist: TREASURY, // some address
  keeper: KEEPER,
  beefyFeeRecipient: TREASURY,
  outputToNativeRoute: [BEAST, wNative],
  outputToLp0Route: [BEAST, wNative, USDC],
  outputToLp1Route: [BEAST, wNative],
};

const contractNames = {
  vault: "ChewyVault",
  strategy: "StrategyBeastFarm",
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
  console.log(predictedAddresses.strategy);

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
    vault.address,
    strategyParams.unirouter,
    strategyParams.keeper,
    strategyParams.strategist,
    strategyParams.beefyFeeRecipient,
    strategyParams.outputToNativeRoute,
    strategyParams.outputToLp0Route,
    strategyParams.outputToLp1Route,
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

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });