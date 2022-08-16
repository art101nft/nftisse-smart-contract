var NFTisse = artifacts.require("NFTisse");

module.exports = function(deployer) {
  let opensea;
  let rmutt;
  if (deployer.network == 'mainnet') {
    opensea = '0xa5409ec958c83c3f309868babaca7c86dcb077c1';
    rmutt = '0x6c61fB2400Bf55624ce15104e00F269102dC2Af4';
    console.log(`[+] Using OpenSea mainnet proxy address ${opensea} and RMUTT address ${rmutt}`);
  } else {
    opensea = '0xf57b2c51ded3a29e6891aba85459d600256cf317';
    rmutt = '0x471365176f83e055d70e050e28d5c654651f12f9';
    console.log(`[+] Using OpenSea testnet proxy address ${opensea} and RMUTT address ${rmutt}`);
  }
  deployer.deploy(NFTisse, opensea, rmutt);
};
