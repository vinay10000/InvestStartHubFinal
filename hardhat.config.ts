import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

// Default private key for development only
const DEFAULT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Hardhat's built-in network for testing
    hardhat: {
      chainId: 31337
    },
    // Sepolia testnet for testing with real ETH
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/your-api-key",
      accounts: [process.env.PRIVATE_KEY || DEFAULT_PRIVATE_KEY],
      chainId: 11155111
    },
    // Mainnet for production (use with caution)
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/your-api-key",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1
    }
  },
  // Configure Etherscan for contract verification
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  },
  // Set the path for artifacts that will be used by the frontend
  paths: {
    artifacts: "./artifacts",
  }
};

export default config;