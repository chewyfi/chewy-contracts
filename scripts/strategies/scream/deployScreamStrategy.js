const hardhat = require("hardhat");

const ethers = hardhat.ethers;

const TREASURY = "0x9E7e642DEA4a7C95F70CA3B6f1d15A416097517A";
const MFAM = "0xbb8d88bcd9749636bc4d2be22aac4bb3b01a58f1";
const wMOVR = "0x98878B06940aE243284CA214f92Bb71a2b032B8A";

const want = "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C"; //ETH
const mWant = "0x6503D905338e2ebB550c9eC39Ced525b612E77aE";

const config = {
  borrowRate: 47,
  borrowRateMax: 50,
  borrowDepth: 4,
  minLeverage: 1000000000000000,
  outputToNativeRoute: [MFAM, wMOVR],
  outputToWantRoute: [MFAM, want],
  markets: [mWant],
  vault: "0x0000000000000000000000000000000000000000",
  unirouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
  keeper: "0x821294D7F966167722c988e4865Ea1F61b2f4dD7",
  strategist: TREASURY,
  beefyFeeRecipient: TREASURY
};

async function main() {
  await hardhat.run("compile");

  const ScreamStrategy = await ethers.getContractFactory("StrategyScream");

  const screamStrategy = await ScreamStrategy.deploy(
    config.borrowRate,
    config.borrowRateMax,
    config.borrowDepth,
    config.minLeverage,
    config.outputToNativeRoute,
    config.outputToWantRoute,
    config.markets,
    config.vault,
    config.unirouter,
    config.keeper,
    config.strategist,
    config.beefyFeeRecipient
  );
  await screamStrategy.deployed();

  console.log("Scream strategy deployed to:", screamStrategy.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });