require("dotenv").config();
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      gas: 2100000,
      gasPrice: 8000000000,
    },
    arbitrum_mainnet: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts:
        process.env.DEV_3_PRIVATE_KEY !== undefined ? [process.env.DEV_3_PRIVATE_KEY] : [],
      gas: 800000000,
    },
    hardhat: {
      forking: {
        url: "https://arb-mainnet.g.alchemy.com/v2/WseHK29t7jl4M6tvO5hhgp1O7S0UYqVC",
        blockNumber: 5927745
      },
    },
    moonbeam: {
      url: "https://rpc.api.moonbeam.network",
      accounts:
        process.env.DEV_3_PRIVATE_KEY !== undefined ? [process.env.DEV_3_PRIVATE_KEY] : [],
      gas: 800000000,
    },
    moonriver: {
      url: "https://moonriver-api.bwarelabs.com/c7724063-cf96-46df-81ca-4bb265cafdf5",
      accounts:
        process.env.DEV_3_PRIVATE_KEY !== undefined ? [process.env.DEV_3_PRIVATE_KEY] : [],
      gas: 80000000000,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};