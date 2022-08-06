var NFTisse = artifacts.require("NFTisse");

module.exports = function(deployer) {
  deployer.deploy(NFTisse, "0x471365176f83e055d70e050e28d5c654651f12f9"); // rinkeby address
};
