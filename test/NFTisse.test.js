// test/NFTisse.test.js
const { execSync } = require("child_process");
const { expect } = require('chai');
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const NFTisse = artifacts.require('NFTisse');

contract('NFTisse', async function (accounts) {

  let skipMint;
  if (process.env.SKIP == 'true') {
    skipMint = true;
  } else {
    skipMint = false;
  }

  const nullAddress = '0x0000000000000000000000000000000000000000';

  function getPrice(amt_eth) {
    return web3.utils.toWei(amt_eth.toString())
  }

  async function simulateTime() {
    // simulate 1+ days
    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      id: 0,
      params: [100000]
    }, (err, result) => {});

    await web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: 0
    }, (err, result) => {});
  }

  beforeEach(async function () {
    this.contract = await NFTisse.new(
      "0xf57b2c51ded3a29e6891aba85459d600256cf317",
      "0x6777DD7A163E070d56543A6D20c942f4D89bF2b0",
      {from: accounts[0]}
    );
  });

  it('sales are paused and RESERVED phase is default', async function () {
    await expect(
      await this.contract.mintingIsActive()
    ).to.equal(false);
    await expect(
      (await this.contract.getMintPhase()).toString()
    ).to.equal('0');
  });

  it('ownership required for key functions', async function () {
    await expectRevert(
      this.contract.withdraw({from: accounts[1]}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.contract.toggleMinting({from: accounts[1]}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.contract.setBaseURI("ipfs://mynewhash", {from: accounts[1]}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.contract.setContractURI("ipfs://myotherhash", {from: accounts[1]}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.contract.toggleProxyState('0x406218da64787A7995897dF4eC2b8c8B3620568a', {from: accounts[1]}),
      'Ownable: caller is not the owner',
    );
    await expectRevert(
      this.contract.reserveTokens({from: accounts[1]}),
      'Ownable: caller is not the owner',
    );
  });

  it('toggles work', async function () {
    // toggleMinting function toggles mintingIsActive var
    await expect(
      await this.contract.mintingIsActive()
    ).to.equal(false);
    await this.contract.toggleMinting();
    await expect(
      await this.contract.mintingIsActive()
    ).to.equal(true);
    await this.contract.toggleMinting();
    await expect(
      await this.contract.mintingIsActive()
    ).to.equal(false);
    // toggleProxyState function toggles proxyApproved var
    await expect(
      await this.contract.proxyApproved(nullAddress)
    ).to.equal(false);
    await this.contract.toggleProxyState(nullAddress);
    await expect(
      await this.contract.proxyApproved(nullAddress)
    ).to.equal(true);
    await this.contract.toggleProxyState(nullAddress);
    await expect(
      await this.contract.proxyApproved(nullAddress)
    ).to.equal(false);
  });

  it('set funcs work', async function () {
    // setBaseURI function will set new metadata URI for NFTs
    const _hash = 'ipfs://mynewhash/';
    await this.contract.setBaseURI(_hash);
    await expect(
      await this.contract.tokenURI(1)
    ).to.equal(_hash + '1');
    await expect(
      await this.contract.tokenURI(2048)
    ).to.equal(_hash + '2048');
  });

  it('reserve func works once and mints 52 to owner', async function () {
    await this.contract.reserveTokens();
    await expect(
      (await this.contract.totalSupply()).toString()
    ).to.equal('52');
    await expect(
      await this.contract.reservedTokens()
    ).to.equal(true);
    await this.contract.reserveTokens();
    await expect(
      (await this.contract.totalSupply()).toString()
    ).to.equal('52');
  });

  it('minting works only for holders during RESERVED phase', async function () {
    await this.contract.toggleMinting();
    // mint from deployer wallet with RMutt holdings
    await this.contract.mintPublic(8);
    await expect(
      (await this.contract.totalSupply()).toString()
    ).to.equal('60'); // 52 reserved for team + 8
    await expect(
      (await this.contract.getMintAmount()).toString()
    ).to.equal('45'); // 53 Rmutt owned - 8 Nftisse just minted
    // try to mint more nftisse than rmutt owned should fail
    await expectRevert(
      this.contract.mintPublic(60),
      'Cannot mint more NFTisse tokens than unclaimed RMutt tokens.'
    );
    // mint remaining reserve
    await this.contract.mintPublic(40);
    await expect(
      (await this.contract.totalSupply()).toString()
    ).to.equal('100');
    await expect(
      (await this.contract.getMintAmount()).toString()
    ).to.equal('5'); // should have 5 remaining
    await this.contract.mintPublic(5);
    await expect(
      (await this.contract.totalSupply()).toString()
    ).to.equal('105');
    await expect(
      (await this.contract.getMintAmount()).toString()
    ).to.equal('0'); // should have used all reserves
    // mint from account with no RMutt holdings during RESERVED phase
    await expectRevert(
      this.contract.mintPublic(1, {from: accounts[1]}),
      'Not enough unclaimed Art101 RMutt tokens.',
    );
  });

  it('minting works for all during PUBLIC phase', async function () {
    await this.contract.toggleMinting();
    await simulateTime();
    // cannot mint more than 3 during PUBLIC
    await expectRevert(
      this.contract.mintPublic(4, {from: accounts[1]}),
      'Cannot mint more than 3 during mint.'
    );
    // cannot mint more than 3 per wallet during mint
    await this.contract.mintPublic(3, {from: accounts[1]});
    await expectRevert(
      this.contract.mintPublic(3, {from: accounts[1]}),
      'Cannot mint more than 3 per wallet.'
    );
    await expectRevert(
      this.contract.mintPublic(3),
      'Cannot mint more than 3 per wallet.'
    );
  })

  it('minting supply will halt minting', async function() {
    this.timeout(0); // dont timeout for this long test
    // Minting should not be active be default
    await expect(
      await this.contract.mintingIsActive()
    ).to.equal(false);
    // Toggle minting
    await this.contract.toggleMinting();
    // Minting should now be active
    await expect(
      await this.contract.mintingIsActive()
    ).to.equal(true);
    // Mint phase is 0 by default (RESERVED; RMUTT holders only)
    await expect(
      (await this.contract.getMintPhase()).toString()
    ).to.equal('0');
    // Simulate 24+ hours for test
    await simulateTime();
    await expect(
      (await this.contract.getMintPhase()).toString()
    ).to.equal('1');
    if (!skipMint) {
      // Mint all 3072 (already minted 52 at contract deploy)
      for (i = 0; i < 1510; i++) {
        await this.contract.mintPublic(2, {from: accounts[3 + i]});
      };
      await expect(
        (await this.contract.totalSupply()).toString()
      ).to.equal('3072');
      // Minting should no longer be active
      await expect(
        await this.contract.mintingIsActive()
      ).to.equal(false);
      // Should not be able to mint more
      await expectRevert(
        this.contract.mintPublic(3, {from: accounts[1]}),
        'Minting is not active.',
      );
    }
  });


});
