import { ethers } from "ethers";
import { toast } from "@/hooks/use-toast";

// Import contract ABIs
import StartupInvestmentABI from "@/contracts/StartupInvestment.json";
import StartupTokenFactoryABI from "@/contracts/StartupTokenFactory.json";
import StartupTokenABI from "@/contracts/StartupToken.json";

// Contract addresses - these would be set after deployment
const CONTRACT_ADDRESSES = {
  // Use environment variables if available, otherwise use placeholder addresses for development
  INVESTMENT: import.meta.env.VITE_INVESTMENT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
  FACTORY: import.meta.env.VITE_FACTORY_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"
};

/**
 * Helper to get a contract instance
 */
export const getContract = async (
  contractAddress: string, 
  contractABI: any, 
  withSigner = false
) => {
  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Contract address not configured");
  }
  
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Ethereum provider not found");
  }
  
  try {
    // Create provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // If we need a signer (for writing to the blockchain)
    if (withSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(contractAddress, contractABI.abi, signer);
    }
    
    // For read-only operations
    return new ethers.Contract(contractAddress, contractABI.abi, provider);
  } catch (error: any) {
    console.error("Error getting contract:", error);
    throw new Error(`Failed to initialize contract: ${error.message}`);
  }
};

/**
 * Get the investment contract
 */
export const getInvestmentContract = async (withSigner = false) => {
  return getContract(
    CONTRACT_ADDRESSES.INVESTMENT,
    StartupInvestmentABI,
    withSigner
  );
};

/**
 * Get the token factory contract
 */
export const getTokenFactoryContract = async (withSigner = false) => {
  return getContract(
    CONTRACT_ADDRESSES.FACTORY,
    StartupTokenFactoryABI,
    withSigner
  );
};

/**
 * Get a startup token contract for a specific token address
 */
export const getStartupTokenContract = async (tokenAddress: string, withSigner = false) => {
  return getContract(
    tokenAddress,
    StartupTokenABI,
    withSigner
  );
};

/**
 * Get startup information from the contract
 */
export const getStartupFromContract = async (startupId: number) => {
  try {
    const contract = await getInvestmentContract();
    const startupInfo = await contract.getStartup(startupId);
    
    return {
      id: startupInfo.id.toString(),
      founderAddress: startupInfo.founderAddress,
      name: startupInfo.name,
      description: startupInfo.description,
      fundingGoal: ethers.formatEther(startupInfo.fundingGoal),
      currentFunding: ethers.formatEther(startupInfo.currentFunding),
      valuation: ethers.formatEther(startupInfo.valuation),
      isActive: startupInfo.isActive,
      createdAt: new Date(Number(startupInfo.createdAt) * 1000)
    };
  } catch (error: any) {
    console.error("Error getting startup from contract:", error);
    throw new Error(`Failed to get startup information: ${error.message}`);
  }
};

/**
 * Invest in a startup with ETH
 */
export const investInStartup = async (startupId: number, amount: string) => {
  try {
    const contract = await getInvestmentContract(true);
    
    // Convert ETH amount to wei
    const amountInWei = ethers.parseEther(amount);
    
    // Make the transaction
    const tx = await contract.investInStartup(startupId, { value: amountInWei });
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    // Return transaction details
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? "success" : "failed"
    };
  } catch (error: any) {
    console.error("Error investing in startup:", error);
    
    // Handle common errors
    if (error.code === "ACTION_REJECTED") {
      throw new Error("Transaction was rejected by the user");
    }
    
    throw new Error(`Investment failed: ${error.message}`);
  }
};

/**
 * Create a new token for a startup
 */
export const createStartupToken = async (
  startupId: number,
  startupName: string,
  tokenName: string,
  tokenSymbol: string,
  initialSupply: string,
  initialValuation: string,
  tokenDecimals = 18
) => {
  try {
    const contract = await getTokenFactoryContract(true);
    
    // Convert to wei
    const supplyInWei = ethers.parseEther(initialSupply);
    const valuationInWei = ethers.parseEther(initialValuation);
    
    // Create the token
    const tx = await contract.createToken(
      startupId,
      startupName,
      tokenName,
      tokenSymbol,
      supplyInWei,
      valuationInWei,
      tokenDecimals
    );
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    // Parse the event to get the token address
    const event = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find((event: any) => event && event.name === "TokenCreated");
    
    return {
      transactionHash: receipt.hash,
      tokenAddress: event ? event.args.tokenAddress : null,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? "success" : "failed"
    };
  } catch (error: any) {
    console.error("Error creating startup token:", error);
    
    // Handle common errors
    if (error.code === "ACTION_REJECTED") {
      throw new Error("Transaction was rejected by the user");
    }
    
    throw new Error(`Token creation failed: ${error.message}`);
  }
};

/**
 * Check if a token exists for a startup
 */
export const checkTokenExists = async (startupId: number) => {
  try {
    const contract = await getTokenFactoryContract();
    return await contract.tokenExists(startupId);
  } catch (error: any) {
    console.error("Error checking if token exists:", error);
    return false;
  }
};

/**
 * Get token address for a startup
 */
export const getTokenAddress = async (startupId: number) => {
  try {
    const contract = await getTokenFactoryContract();
    return await contract.getTokenAddress(startupId);
  } catch (error: any) {
    console.error("Error getting token address:", error);
    return null;
  }
};

/**
 * Get startup information from token contract
 */
export const getStartupInfoFromToken = async (tokenAddress: string) => {
  try {
    const contract = await getStartupTokenContract(tokenAddress);
    const info = await contract.getStartupInfo();
    
    return {
      startupId: info.startupId.toString(),
      startupName: info.startupName,
      valuation: ethers.formatEther(info.valuation),
      totalShares: ethers.formatEther(info.totalShares)
    };
  } catch (error: any) {
    console.error("Error getting startup info from token:", error);
    throw new Error(`Failed to get startup information: ${error.message}`);
  }
};