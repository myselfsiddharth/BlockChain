require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

const {
  POLYGON_RPC_URL,
  POLYGON_AMOY_RPC_URL,
  AMOY_RPC_URL,
  PRIVATE_KEY,
} = process.env;

const polygonAccounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    /**
     * Polygon PoS mainnet — https://polygon.technology/polygon-pos
     * Chain ID 137. Native gas token: POL (use a funded deployer key).
     */
    polygon: {
      url: POLYGON_RPC_URL || "https://polygon-rpc.com",
      chainId: 137,
      accounts: polygonAccounts,
    },
    /**
     * Polygon Amoy testnet (successor to Mumbai).
     * Chain ID 80002. Use test POL from a faucet for gas.
     */
    amoy: {
      url: POLYGON_AMOY_RPC_URL || AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: polygonAccounts,
    },
  },
};
