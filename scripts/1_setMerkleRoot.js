const newMerkleRoot = '0x63804225b9568d8c1857add546b48f5685e64421124dbbb426d6aab56c2e19c3';

module.exports = async function main(callback) {
  try {
    const NFTisse = artifacts.require("NFTisse");
    const contract = await NFTisse.deployed();
    if (newMerkleRoot == '') {
      console.log('[!] You need to specify a merkle root hash.');
      callback(1);
    } else {
      await contract.setMerkleRoot(newMerkleRoot);
      console.log(`[+] Set new merkle root hash as: ${newMerkleRoot}`);
      callback(0);
    }
  } catch (error) {
    console.error(error);
    callback(1);
  }
}
