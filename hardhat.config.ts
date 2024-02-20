import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: { optimizer: { enabled: true, runs: 10000 } },
  },
  networks: {
    mainnet: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_ETH}`,
    },
    arbitrumOne: {
      url: "https://arbitrum.llamarpc.com",
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_GOERLI}`,
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_SEPOLIA}`,
    },
    frame: {
      url: "http://127.0.0.1:1248",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
    currency: "USD",
    gasPrice: 20,
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY_ETH || "",
      sepolia: process.env.ETHERSCAN_API_KEY_ETH || "",
      arbitrumOne: process.env.ETHERSCAN_API_KEY_ARB || "",
    },
  },
  mocha: {
    timeout: 400000000,
  },
};

export default config;
