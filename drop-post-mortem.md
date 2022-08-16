# NFT-isse Mint Delay Post-Mortem

## What happened?

* many people reported egregious gas estimates in their web3 wallets (Metamask, Coinbase, etc) when attempting to mint
* some people reported failing transactions when minting
* some people minted fine, but gas fees were pretty high

## Why did this happen?

### The long answer

We attempted to use a new format when minting to eliminate the extra logistics of using a snapshot based approach since it requires many extra steps. This new format involves referencing an external contract, in this case RMUTT, to query wallet balances. In order to prevent abuse and enforce limits, we query the wallet's token holdings since we used ERC721A which providers the ability to enumerate token IDs that a wallet holds, and store it in a mapping to "lock" token IDs to prevent duplicate claiming by transferring off balances. This has the result of being more gas-heavy since we have to loop through a wallet's owned RMUTT tokens and check or update a mapping. This can be seen in the following code:

```
mapping(uint256 => bool) public tokenUsed;        // token ids used to reserve mints

// Determine amount the address can expect to mint based upon current phase and existing holdings
function getMintAmount() public view returns (uint256 amt) {
    MintPhase mintphase = getMintPhase();
    if (mintphase == MintPhase.RESERVED) {
        // Require ownership of RMUTT
        uint256 availableMints;
        // Check all owned tokens to see if they have been used to claim already
        for(uint256 i = 0; i < RMUTT.balanceOf(msg.sender); i++) {
            uint256 token = RMUTT.tokenOfOwnerByIndex(msg.sender, i);
            if (!tokenUsed[token]) {
                availableMints = availableMints.add(1);
            }
        }
        return availableMints;
    } else if (mintphase == MintPhase.PUBLIC) {
        // No requirements, public can mint
        // Return only the amount they can mint remaining
        if (walletBalance[msg.sender] >= maxMint) {
          return 0;
        } else {
          return maxMint - walletBalance[msg.sender];
        }
    }
}

function mintPublic(uint256 numberOfTokens) external payable {
    require(mintingIsActive, "Minting is not active.");
    require(msg.sender == tx.origin, "Cannot mint from external contract.");
    require(totalSupply().add(numberOfTokens) <= maxSupply, "Minting would exceed max supply.");

    if (getMintPhase() == MintPhase.PUBLIC) {
        require(numberOfTokens <= maxMint, "Cannot mint more than 3 during mint.");
        require(walletBalance[msg.sender].add(numberOfTokens) <= maxWallet, "Cannot mint more than 3 per wallet.");
    } else {
        uint256 mintable = getMintAmount();
        require(mintable > 0, "Not enough unclaimed Art101 RMutt tokens.");
        require(numberOfTokens <= mintable, "Cannot mint more NFTisse tokens than unclaimed RMutt tokens.");
        uint256 locked;
        for(uint256 i = 0; i < RMUTT.balanceOf(msg.sender); i++) {
            // get each token user owns and lock that token to prevent duplicate buys and increment amount available to mint
            // only lock tokens up to the amount requested
            if (locked < numberOfTokens) {
                uint256 token = RMUTT.tokenOfOwnerByIndex(msg.sender, i);
                if (!tokenUsed[token]) {
                    tokenUsed[token] = true;
                    locked = locked.add(1);
                }
            }
        }
    }

    _mintTokens(numberOfTokens);
}
```

While this is an *expected* result, the magnitude of gas usage was outside of my expectations/assumptions and was not thoroughly reviewed and considered before contract deployment.

This oversight can be seen in the following mainnet transaction: https://etherscan.io/tx/0x65de5ec9f0861ca9edba6971daac2d35b1b00d395d8558ef0aac917b45a21aca

This wallet minted 1 NFT-isse but because the contract was so inefficient it needed 3,307,101 gas to complete the tx - a typical NFT mint will be ~80,000 - ~100,000 gas. That's egregious!

### The short answer

LZA got lazy, tried to use a technique to "live-check" tokens, didn't pay attention to gas consumption on test networks, and deployed a contract which was just too gas heavy.

## What will be done?

We will be adjusting the contract and the website to do a typical snapshot based minting in which a list of wallets and amounts is generated off-chain and distributed via merkle tree signatures....the same way as our previous drops. Wallets on the snapshot can mint their expected amount, and 24 hours after starting the mint the public mint will resume as expected.

Mint delay should hopefully be just 24 hours assuming we can get things fixed tonight. (LZA is PST)



# Thanks for reading!
