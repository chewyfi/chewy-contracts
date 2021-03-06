const hardhat = require("hardhat");

const ethers = hardhat.ethers;

const config = {
  strategy: "0xDf35A40E68218717Eacae7ae44d81bad8E618737",
  name: "Chewy MoonWell ETH",
  symbol: "cwyMoonwellETH",
  approvalDelay: 21600,
};

async function main() {
  await hardhat.run("compile");

  const Vault = await ethers.getContractFactory("BeefyVaultV6");

  const vault = await Vault.deploy(
    config.strategy,
    config.name,
    config.symbol,
    config.approvalDelay
  );
  await vault.deployed();

  console.log("Vault deployed to:", vault.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });