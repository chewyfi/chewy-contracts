const hardhat = require("hardhat");

const ethers = hardhat.ethers;

const config = {
  native: "0x98878B06940aE243284CA214f92Bb71a2b032B8A",
  strategy: "TODO",
  name: "Woof MoonWell ETH",
  symbol: "woofMoonwellETH",
  approvalDelay: 21600,
};

async function main() {
  await hardhat.run("compile");

  const Vault = await ethers.getContractFactory("BeefyVaultV6Native");

  const vault = await Vault.deploy(
    config.native,
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