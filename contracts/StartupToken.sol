// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StartupToken
 * @dev ERC20 token that represents equity shares in a startup
 */
contract StartupToken is ERC20, ERC20Burnable, Ownable {
    string private _startupName;
    uint256 private _startupId;
    uint256 private _tokenDecimals;
    uint256 private _startupValuation;
    
    // Events
    event ValuationUpdated(uint256 previousValuation, uint256 newValuation);
    event EquityMinted(address indexed to, uint256 amount, uint256 valuation);
    
    /**
     * @dev Constructor for creating a new startup token
     * @param startupId ID of the startup
     * @param startupName Name of the startup
     * @param tokenName Name of the token
     * @param tokenSymbol Symbol of the token
     * @param initialSupply Initial supply of tokens (in smallest units)
     * @param initialValuation Initial valuation of the startup
     * @param tokenDecimals Number of decimals the token has
     */
    constructor(
        uint256 startupId,
        string memory startupName,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        uint256 initialValuation,
        uint8 tokenDecimals
    ) ERC20(tokenName, tokenSymbol) Ownable(msg.sender) {
        _startupId = startupId;
        _startupName = startupName;
        _tokenDecimals = tokenDecimals;
        _startupValuation = initialValuation;
        
        // Mint initial supply to the contract creator
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }
    
    /**
     * @dev Override the decimals function to return custom decimals
     */
    function decimals() public view virtual override returns (uint8) {
        return uint8(_tokenDecimals);
    }
    
    /**
     * @dev Get startup information
     */
    function getStartupInfo() external view returns (
        uint256 startupId,
        string memory startupName,
        uint256 valuation,
        uint256 totalShares
    ) {
        return (_startupId, _startupName, _startupValuation, totalSupply());
    }
    
    /**
     * @dev Update startup valuation
     * @param newValuation New valuation of the startup
     */
    function updateValuation(uint256 newValuation) external onlyOwner {
        require(newValuation > 0, "Valuation must be positive");
        
        uint256 previousValuation = _startupValuation;
        _startupValuation = newValuation;
        
        emit ValuationUpdated(previousValuation, newValuation);
    }
    
    /**
     * @dev Mint new tokens (equity)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param investmentAmount Amount of investment made (for record keeping)
     */
    function mintEquity(address to, uint256 amount, uint256 investmentAmount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be positive");
        
        _mint(to, amount);
        
        emit EquityMinted(to, amount, _startupValuation);
    }
    
    /**
     * @dev Calculate token amount for a given investment
     * @param investmentAmount Amount of investment in wei
     * @return Amount of tokens to mint
     */
    function calculateEquityAmount(uint256 investmentAmount) external view returns (uint256) {
        require(investmentAmount > 0, "Investment must be positive");
        require(_startupValuation > 0, "Valuation must be set");
        
        // Calculate the proportion of equity
        // equity = (investment / valuation) * totalSupply
        return (investmentAmount * totalSupply()) / _startupValuation;
    }
}