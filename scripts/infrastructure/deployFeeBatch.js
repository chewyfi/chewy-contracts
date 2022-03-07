const hardhat = require("hardhat");

const ethers = hardhat.ethers;

const config = {
  treasury: "TODO",
  rewardPool: "TODO",
  unirouter: "TODO",
  bifi: "TODO",
  wNative: "TODO",
};

async function main() {
  await hardhat.run("compile");

  const BeefyFeeBatch = await ethers.getContractFactory("BeefyFeeBatch");
  const batcher = await BeefyFeeBatch.deploy(
    config.treasury,
    config.rewardPool,
    config.unirouter,
    config.bifi,
    config.wNative
  );
  await batcher.deployed();

  console.log("Deployed to:", batcher.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });