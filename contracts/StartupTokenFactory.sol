// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StartupToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StartupTokenFactory
 * @dev Factory contract for creating StartupToken contracts
 */
contract StartupTokenFactory is Ownable {
    // Mapping from startup ID to token address
    mapping(uint256 => address) public startupTokens;
    
    // Event for token creation
    event TokenCreated(uint256 indexed startupId, address indexed tokenAddress, string name, string symbol);
    
    /**
     * @dev Initialize the contract with the deployer as the owner
     */
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new token for a startup
     * @param startupId ID of the startup
     * @param startupName Name of the startup
     * @param tokenName Name of the token
     * @param tokenSymbol Symbol of the token
     * @param initialSupply Initial supply of tokens
     * @param initialValuation Initial valuation of the startup
     * @param tokenDecimals Number of decimals the token has
     * @return Address of the newly created token
     */
    function createToken(
        uint256 startupId,
        string memory startupName,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        uint256 initialValuation,
        uint8 tokenDecimals
    ) external onlyOwner returns (address) {
        require(startupTokens[startupId] == address(0), "Token already exists for this startup");
        
        StartupToken newToken = new StartupToken(
            startupId,
            startupName,
            tokenName,
            tokenSymbol,
            initialSupply,
            initialValuation,
            tokenDecimals
        );
        
        address tokenAddress = address(newToken);
        startupTokens[startupId] = tokenAddress;
        
        // Transfer ownership of the token to the factory owner
        newToken.transferOwnership(owner());
        
        emit TokenCreated(startupId, tokenAddress, tokenName, tokenSymbol);
        
        return tokenAddress;
    }
    
    /**
     * @dev Get token address for a startup
     * @param startupId ID of the startup
     * @return Token address
     */
    function getTokenAddress(uint256 startupId) external view returns (address) {
        return startupTokens[startupId];
    }
    
    /**
     * @dev Check if a token exists for a startup
     * @param startupId ID of the startup
     * @return True if token exists
     */
    function tokenExists(uint256 startupId) external view returns (bool) {
        return startupTokens[startupId] != address(0);
    }
}