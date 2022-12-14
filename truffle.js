require('dotenv').config();
const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
    development: {
     host: "127.0.0.1",
     port: 8545,
     network_id: "*",
    },
    testnet: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, "https://rinkeby.infura.io/v3/" + process.env.INFURA_PID),
      network_id: 4,
      confirmations: 1,
      timeoutBlocks: 10,
      skipDryRun: true,
      production: false,
      gas: 3500000,
      gasPrice: 2000000000 // 2 gwei
    },
    mainnet: {
      networkTimeout: 10000,
      provider: () => new HDWalletProvider(process.env.MNEMONIC, "https://mainnet.infura.io/v3/" + process.env.INFURA_PID),
      network_id: 1,
      confirmations: 3,
      timeoutBlocks: 30,
      skipDryRun: false,
      production: true,
      gas: 3500000,
      gasPrice: 25000000000 // 20 gwei
    },
  },
  mocha: {
    reporter: "eth-gas-reporter",
    reporterOptions: {
      gasPrice: 30,
      outputFile: "testResults.log",
      forceConsoleOutput: true,
      rst: true,
      noColors: true
    },
  },
  compilers: {
    solc: {
      version: "^0.8.0",
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    'etherscan': process.env.ETHERSCAN_API
  }
};
