// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


/**
 * Used to delegate ownership of a contract to another address,
 * to save on unneeded transactions to approve contract use for users
 */
contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract NFTisse is ERC721A, Ownable {
    using SafeMath for uint256;

    enum MintPhase {
        RESERVED,  // 1 - only RMUTT holders can mint
        PUBLIC     // 2 - no requirements, public can mint, including reserves
    }

    mapping(address => bool) public proxyApproved; // proxy accounts for easy listing

    bool public mintingIsActive = false;           // control if mints can proceed
    bool public reservedTokens = false;            // if team has minted tokens already
    uint256 public constant maxSupply = 3072;      // total supply
    uint256 public constant maxMint = 3;           // max per mint (non-holders)
    uint256 public constant maxWallet = 3;         // max per wallet (non-holders)
    uint256 public constant teamReserve = 52;      // amount to mint to the team
    uint256 public startTime;                      // timestamp when minting begins to track hours between phases
    uint256 public reserveTime;                    // timestamp when reserves allowed to be minted
    address public immutable proxyRegistryAddress; // primary proxy address (opensea)
    string public baseURI;                         // base URI of hosted IPFS assets
    string public _contractURI;                    // contract URI for details

    constructor(
        address _proxyRegistryAddress
    ) ERC721A("NFTisse", "NFTISSE") {
        proxyRegistryAddress = _proxyRegistryAddress;
        reserveTokens(); // reserve tokens for team
    }

    // Show contract URI
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    // Return number of seconds since we started the initial timer (startTime)
    function getTimeElapsed() public view returns (uint256 ts) {
        if (startTime > 0) {
            return block.timestamp - startTime;
        }
        return 0;
    }

    // Return number of seconds until next phase of minting begins
    function getTimeUntilNextPhase() public view returns (uint256 ts) {
        if (block.timestamp < reserveTime) {
            return reserveTime - block.timestamp;
        }
        return 0;
    }

    // Get mint phase based upon time elapsed
    function getMintPhase() public view returns (MintPhase phase) {
        if (startTime > 0) {
            if (block.timestamp < reserveTime) {
                return MintPhase.RESERVED;
            } else {
                return MintPhase.PUBLIC;
            }
        }
        return MintPhase.RESERVED;
    }

    // Withdraw contract balance to creator (mnemonic seed address 0)
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    // Flip the minting from active or paused
    function toggleMinting() external onlyOwner {
        if (startTime == 0) {
            // Update phase times when we first toggle minting
            startTime = block.timestamp;
            reserveTime = startTime + 24 hours;
        }
        mintingIsActive = !mintingIsActive;
    }

    // Flip the proxy approval state for a given address
    function toggleProxyState(address proxyAddress) external onlyOwner {
        proxyApproved[proxyAddress] = !proxyApproved[proxyAddress];
    }

    // Specify a new IPFS URI for token metadata
    function setBaseURI(string memory URI) external onlyOwner {
        baseURI = URI;
    }

    // Specify a new contract URI
    function setContractURI(string memory URI) external onlyOwner {
        _contractURI = URI;
    }

    // Reserve some tokens for giveaways
    function reserveTokens() public onlyOwner {
        // Only allow one-time reservation of tokens
        if (!reservedTokens) {
            _mintTokens(teamReserve);
            reservedTokens = true;
        }
    }

    // Internal mint function
    function _mintTokens(uint256 numberOfTokens) private {
        require(numberOfTokens > 0, "Must mint at least 1 token.");

        // Mint number of tokens requested
        _safeMint(msg.sender, numberOfTokens);

        // Disable minting if max supply of tokens is reached
        if (totalSupply() == maxSupply) {
            mintingIsActive = false;
        }
    }

    // Mint public
    function mintPublic(uint256 numberOfTokens) external payable {
        require(mintingIsActive, "Minting is not active.");
        require(msg.sender == tx.origin, "Cannot mint from external contract.");
        require(totalSupply().add(numberOfTokens) <= maxSupply, "Minting would exceed max supply.");

        if (getMintPhase() == MintPhase.PUBLIC) {
            require(numberOfTokens <= maxMint, "Cannot mint more than 3 during mint.");
            require(balanceOf(msg.sender).add(numberOfTokens) <= maxWallet, "Cannot mint more than 3 per wallet.");
        } 

        _mintTokens(numberOfTokens);
    }

    /*
     * Override the below functions from parent contracts
     */

    // Always return tokenURI, even if token doesn't exist yet
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721A)
        returns (string memory)
    {
        return string(abi.encodePacked(baseURI, Strings.toString(tokenId)));
    }

    // Whitelist proxy contracts for easy trading on platforms (Opensea is default)
    function isApprovedForAll(address _owner, address _operator)
        public
        view
        override(ERC721A)
        returns (bool isOperator)
    {
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(_owner)) == _operator || proxyApproved[_operator]) {
            return true;
        }

        return super.isApprovedForAll(_owner, _operator);
    }
}