// test/NFTisse.test.js
const { execSync } = require("child_process");
const { expect } = require('chai');
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const NFTisse = artifacts.require('NFTisse');

contract('NFTisse', function ([owner, other, other2, other3]) {

  let skipMint;
  if (process.env.SKIP == 'true') {
    skipMint = true;
  } else {
    skipMint = false;
  }

  function getPrice(amt_eth) {
    return web3.utils.toWei(amt_eth.toString())
  }

  beforeEach(async function () {
    this.nftisse = await NFTisse.new("0xf57b2c51ded3a29e6891aba85459d600256cf317", {from: owner});
  });

  it('sales are paused by default', async function () {
    await expect(
      await this.nftisse.mintingIsActive()
    ).to.equal(false);
  });

  it('ownership required for key functions', async function () {
    await expectRevert(
      this.nftisse.withdraw({from: other}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.nftisse.toggleMinting({from: other}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.nftisse.toggleEarlyAccessMode({from: other}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.nftisse.setBaseURIreg("ipfs://mynewhash", {from: other}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.nftisse.setBaseURIpaid("ipfs://mynewhash", {from: other}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.nftisse.setMerkleRoot('0x00', {from: other}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.nftisse.reserveTokens({from: other}),
      'Ownable: caller is not the owner',
    );
  });

  it('toggles work', async function () {
    // toggleMinting function toggles mintingIsActive var
    await expect(
      await this.nftisse.mintingIsActive()
    ).to.equal(false);
    await this.nftisse.toggleMinting();
    await expect(
      await this.nftisse.mintingIsActive()
    ).to.equal(true);
    await this.nftisse.toggleMinting();
    await expect(
      await this.nftisse.mintingIsActive()
    ).to.equal(false);
    // toggleEarlyAccessMode function toggles earlyAccessMode var
    await expect(
      await this.nftisse.earlyAccessMode()
    ).to.equal(true);
    await this.nftisse.toggleEarlyAccessMode();
    await expect(
      await this.nftisse.earlyAccessMode()
    ).to.equal(false);
    await this.nftisse.toggleEarlyAccessMode();
    await expect(
      await this.nftisse.earlyAccessMode()
    ).to.equal(true);
  });

  it('set funcs work', async function () {
    // setBaseURI function will set new metadata URI for NFTs
    const _hash = 'ipfs://mynewhash/';
    await this.nftisse.setBaseURIreg(_hash);
    await expect(
      await this.nftisse.tokenURI(1)
    ).to.equal(_hash + '1');
    await expect(
      await this.nftisse.tokenURI(2048)
    ).to.equal(_hash + '2048');
    // setMerkleRoot function sets merkle root
    const _merkle = '0x0000000000000000000000000000000000000000000000000000000000000000';
    await expect(
      await this.nftisse.merkleSet()
    ).to.equal(false);
    await this.nftisse.setMerkleRoot(_merkle);
    await expect(
      await this.nftisse.merkleSet()
    ).to.equal(true);
  });

  it('reserve func works once and mints 30 to owner', async function () {
    await this.nftisse.reserveTokens();
    await expect(
      (await this.nftisse.totalSupply()).toString()
    ).to.equal('30');
    await expect(
      await this.nftisse.reservedTokens()
    ).to.equal(true);
    await this.nftisse.reserveTokens();
    await expect(
      (await this.nftisse.totalSupply()).toString()
    ).to.equal('30');
    // first 15 should be paid for metadata uri
    for (i = 0; i < 30; i++) {
      if (i < 15) {
        await expect(
          await this.nftisse.tokenURI(i)
        ).to.equal(baseURIpaid + i);
      } else {
        await expect(
          await this.nftisse.tokenURI(i)
        ).to.equal(baseURIreg + i);
      }
    }
  });

  it('early access mode w/ merkle root hash allows whitelist minting', async function () {
    let root = proofs.root.Proof[0];
    await this.nftisse.setMerkleRoot(root);
    await this.nftisse.toggleMinting();

    // Mint 1 for .01
    await this.nftisse.mintTokens(
      proofs[other].Index,
      other,
      proofs[other].Amount,
      proofs[other].Proof,
      1, {value: getPrice(.01), from: other}
    );
    await expect(
      (await this.nftisse.totalSupply()).toString()
    ).to.equal('1');

    // .01 payment should be paid base URI
    await expect(
      await this.nftisse.tokenURI(0)
    ).to.equal(baseURIpaid + '0');

    // Mint 1 for .009
    await this.nftisse.mintTokens(
      proofs[other].Index,
      other,
      proofs[other].Amount,
      proofs[other].Proof,
      1, {value: getPrice(.009), from: other}
    );
    await expect(
      (await this.nftisse.totalSupply()).toString()
    ).to.equal('2');

    // .009 payment should be regular base URI
    await expect(
      await this.nftisse.tokenURI(1)
    ).to.equal(baseURIreg + '1');

    // Mint 1 for 0
    await this.nftisse.mintTokens(
      proofs[other].Index,
      other,
      proofs[other].Amount,
      proofs[other].Proof,
      1, {value: 0, from: other}
    );
    await expect(
      (await this.nftisse.totalSupply()).toString()
    ).to.equal('3');

    // 0 payment should be regular base URI
    await expect(
      await this.nftisse.tokenURI(2)
    ).to.equal(baseURIreg + '2');

    // Should enforce merkle proofs
    await expectRevert(
      this.nftisse.mintTokens(0, owner, 0, [], 1, {value: getPrice(.01), from: owner}),
      'Invalid merkle proof.',
    );

    // mint 10 with other3 wallet
    await this.nftisse.mintTokens(
      proofs[other3].Index,
      other3,
      proofs[other3].Amount,
      proofs[other3].Proof,
      10, {value: getPrice(.1), from: other3}
    );
    // transfer all 10 to other wallet
    for (i = 3; i < 13; i++) {
      await this.nftisse.transferFrom(other3, other2, i, {from: other3});
    }
    await expect(
      (await this.nftisse.totalSupply()).toString()
    ).to.equal('13');
    // mint 10 more with other3 wallet - should fail
    await expectRevert(
      this.nftisse.mintTokens(
        proofs[other3].Index,
        other3,
        proofs[other3].Amount,
        proofs[other3].Proof,
        10, {value: getPrice(.1), from: other3}
      ),
      'Cannot exceed amount whitelisted during early access mode.',
    );
    // still 13 supply, still 10 tracked for other3 wallet
    await expect(
      (await this.nftisse.totalSupply()).toString()
    ).to.equal('13');
    await expect(
      (await this.nftisse.earlyAccessMinted(other3)).toString()
    ).to.equal('10');
  });

  it('minting works', async function () {
    await this.nftisse.toggleMinting();
    await this.nftisse.toggleEarlyAccessMode();
    await this.nftisse.mintTokens(0, other, 0, [], 1, {value: 0, from: other});
    await expect(
      (await this.nftisse.totalSupply()).toString()
    ).to.equal('1');
    await this.nftisse.mintTokens(0, other, 0, [], 2, {value: 0, from: other});
    await expect(
      (await this.nftisse.totalSupply()).toString()
    ).to.equal('3');
    await expectRevert(
      this.nftisse.mintTokens(0, other, 0, [], 6, {value: 0, from: other}),
      'Cannot mint more than 5 per tx during public sale.',
    );
  });

  it('minting supply will halt minting', async function() {
    // Minting should not be active and early access mode is on by default
    await expect(
      await this.nftisse.mintingIsActive()
    ).to.equal(false);
    await expect(
      await this.nftisse.earlyAccessMode()
    ).to.equal(true);
    // Toggle minting and early access mode
    await this.nftisse.toggleMinting();
    await this.nftisse.toggleEarlyAccessMode();
    // Minting/early access should now be on/off
    await expect(
      await this.nftisse.mintingIsActive()
    ).to.equal(true);
    await expect(
      await this.nftisse.earlyAccessMode()
    ).to.equal(false);
    if (!skipMint) {
      // Mint all 2048
      for (i = 0; i < 512; i++) {
        await this.nftisse.mintTokens(0, other, 0, [], 4, {value: 0, from: other});
      }
      await expect(
        (await this.nftisse.totalSupply()).toString()
      ).to.equal('2048');
      // Minting should no longer be active
      await expect(
        await this.nftisse.mintingIsActive()
      ).to.equal(false);
      // Should not be able to mint more
      await expectRevert(
        this.nftisse.mintTokens(0, other, 0, [], 1, {value: 0, from: other}),
        'Minting is not active.',
      );
    }
  })


});
