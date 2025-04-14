// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title StartupInvestment
 * @dev Contract for managing investments in startups
 */
contract StartupInvestment is Ownable, ReentrancyGuard {
    // Struct to store startup information
    struct Startup {
        uint256 id;
        address payable founderAddress;
        string name;
        string description;
        uint256 fundingGoal;
        uint256 currentFunding;
        uint256 valuation;
        bool isActive;
        uint256 createdAt;
    }

    // Struct to store investment information
    struct Investment {
        uint256 id;
        uint256 startupId;
        address investorAddress;
        uint256 amount;
        uint256 timestamp;
        bool isVerified;
    }

    // Mapping from startup ID to Startup
    mapping(uint256 => Startup) public startups;
    
    // Mapping from investment ID to Investment
    mapping(uint256 => Investment) public investments;
    
    // Counters for IDs
    uint256 private nextStartupId = 1;
    uint256 private nextInvestmentId = 1;
    
    // Events
    event StartupRegistered(uint256 indexed startupId, address indexed founder, string name, uint256 fundingGoal);
    event InvestmentReceived(uint256 indexed investmentId, uint256 indexed startupId, address indexed investor, uint256 amount);
    event InvestmentVerified(uint256 indexed investmentId, uint256 indexed startupId);
    event FundsWithdrawn(uint256 indexed startupId, address indexed founder, uint256 amount);
    
    /**
     * @dev Initialize the contract with the deployer as the owner
     */
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Register a new startup in the platform
     * @param founderAddress Address of the startup founder
     * @param name Name of the startup
     * @param description Brief description of the startup
     * @param fundingGoal Funding goal in wei
     * @param valuation Initial valuation of the startup
     */
    function registerStartup(
        address payable founderAddress,
        string memory name,
        string memory description,
        uint256 fundingGoal,
        uint256 valuation
    ) external onlyOwner {
        require(founderAddress != address(0), "Invalid founder address");
        require(fundingGoal > 0, "Funding goal must be positive");
        require(valuation > 0, "Valuation must be positive");
        
        uint256 startupId = nextStartupId++;
        
        startups[startupId] = Startup({
            id: startupId,
            founderAddress: founderAddress,
            name: name,
            description: description,
            fundingGoal: fundingGoal,
            currentFunding: 0,
            valuation: valuation,
            isActive: true,
            createdAt: block.timestamp
        });
        
        emit StartupRegistered(startupId, founderAddress, name, fundingGoal);
    }
    
    /**
     * @dev Invest in a startup using Ether
     * @param startupId ID of the startup to invest in
     */
    function investInStartup(uint256 startupId) external payable nonReentrant {
        require(msg.value > 0, "Investment amount must be positive");
        require(startups[startupId].isActive, "Startup is not active");
        
        Startup storage startup = startups[startupId];
        
        uint256 investmentId = nextInvestmentId++;
        
        investments[investmentId] = Investment({
            id: investmentId,
            startupId: startupId,
            investorAddress: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            isVerified: false
        });
        
        // We don't increase currentFunding yet - it happens after verification
        
        emit InvestmentReceived(investmentId, startupId, msg.sender, msg.value);
    }
    
    /**
     * @dev Verify an investment (admin-only function)
     * @param investmentId ID of the investment to verify
     */
    function verifyInvestment(uint256 investmentId) external onlyOwner {
        Investment storage investment = investments[investmentId];
        require(!investment.isVerified, "Investment already verified");
        require(investment.id == investmentId, "Investment does not exist");
        
        Startup storage startup = startups[investment.startupId];
        
        // Mark as verified
        investment.isVerified = true;
        
        // Update startup funding
        startup.currentFunding += investment.amount;
        
        emit InvestmentVerified(investmentId, investment.startupId);
    }
    
    /**
     * @dev Allow founder to withdraw verified investment funds
     * @param startupId ID of the startup
     * @param amount Amount to withdraw (in wei)
     */
    function withdrawFunds(uint256 startupId, uint256 amount) external nonReentrant {
        Startup storage startup = startups[startupId];
        
        require(msg.sender == startup.founderAddress, "Only founder can withdraw");
        require(amount > 0, "Withdrawal amount must be positive");
        require(amount <= startup.currentFunding, "Insufficient funds");
        
        // Update current funding
        startup.currentFunding -= amount;
        
        // Transfer funds to founder
        (bool success, ) = startup.founderAddress.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsWithdrawn(startupId, startup.founderAddress, amount);
    }
    
    /**
     * @dev Get startup details
     * @param startupId ID of the startup
     */
    function getStartup(uint256 startupId) external view returns (
        uint256 id,
        address founderAddress,
        string memory name,
        string memory description,
        uint256 fundingGoal,
        uint256 currentFunding,
        uint256 valuation,
        bool isActive,
        uint256 createdAt
    ) {
        Startup storage startup = startups[startupId];
        return (
            startup.id,
            startup.founderAddress,
            startup.name,
            startup.description,
            startup.fundingGoal,
            startup.currentFunding,
            startup.valuation,
            startup.isActive,
            startup.createdAt
        );
    }
    
    /**
     * @dev Get investment details
     * @param investmentId ID of the investment
     */
    function getInvestment(uint256 investmentId) external view returns (
        uint256 id,
        uint256 startupId,
        address investorAddress,
        uint256 amount,
        uint256 timestamp,
        bool isVerified
    ) {
        Investment storage investment = investments[investmentId];
        return (
            investment.id,
            investment.startupId,
            investment.investorAddress,
            investment.amount,
            investment.timestamp,
            investment.isVerified
        );
    }
    
    /**
     * @dev Change active status of a startup
     * @param startupId ID of the startup
     * @param isActive New active status
     */
    function setStartupActive(uint256 startupId, bool isActive) external onlyOwner {
        require(startups[startupId].id == startupId, "Startup does not exist");
        startups[startupId].isActive = isActive;
    }
    
    /**
     * @dev Get the total number of startups
     */
    function getStartupsCount() external view returns (uint256) {
        return nextStartupId - 1;
    }
    
    /**
     * @dev Get the total number of investments
     */
    function getInvestmentsCount() external view returns (uint256) {
        return nextInvestmentId - 1;
    }
}