var NFTisse = artifacts.require("NFTisse");

module.exports = function(deployer) {
  let addr;
  if (deployer.network == 'mainnet') {
    console.log('[+] Using OpenSea mainnet proxy address 0xa5409ec958c83c3f309868babaca7c86dcb077c1');
    addr = '0xa5409ec958c83c3f309868babaca7c86dcb077c1';
  } else {
    console.log('[+] Using OpenSea testnet proxy address 0xf57b2c51ded3a29e6891aba85459d600256cf317');
    addr = '0xf57b2c51ded3a29e6891aba85459d600256cf317';
  }
  deployer.deploy(NFTisse, addr, "0x6777DD7A163E070d56543A6D20c942f4D89bF2b0");
};
