import { ethers } from "ethers";
import { toast } from "@/hooks/use-toast";

// Import contract ABIs
import StartupInvestmentABI from "@/contracts/StartupInvestment.json";
import StartupTokenFactoryABI from "@/contracts/StartupTokenFactory.json";
import StartupTokenABI from "@/contracts/StartupToken.json";

// Import deployment data from assets
import deploymentData from "@/assets/deployment.json";

// Contract addresses from deployment or environment variables as fallback
const CONTRACT_ADDRESSES = {
  // Use environment variables if available, deployment data as secondary, fallback to placeholder addresses
  INVESTMENT: import.meta.env.VITE_INVESTMENT_CONTRACT_ADDRESS || 
              deploymentData.startupInvestment || 
              "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Default Hardhat first address
  FACTORY: import.meta.env.VITE_FACTORY_CONTRACT_ADDRESS || 
           deploymentData.startupTokenFactory || 
           "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"  // Default Hardhat second address
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
export const investInStartup = async (startupId: number, amount: string, founderWalletAddress?: string) => {
  console.log(`[Contract Interaction] Starting investment process`);
  console.log(`[Contract Interaction] Raw inputs - startupId:`, startupId, "amount:", amount, "founderWalletAddress:", founderWalletAddress, "types:", {
    startupIdType: typeof startupId,
    amountType: typeof amount,
    founderWalletAddressType: typeof founderWalletAddress
  });
  
  try {
    // Ensure startupId is a valid number
    if (typeof startupId !== 'number' || isNaN(startupId)) {
      console.error(`[Contract Interaction] Invalid startupId: ${startupId} (${typeof startupId})`);
      throw new Error("Invalid startup ID: must be a number");
    }
    
    // Use the actual startupId rather than forcing to 1
    const contractStartupId = startupId;
    console.log(`[Contract Interaction] Using contractStartupId: ${contractStartupId}`);
    
    const contract = await getInvestmentContract(true);
    console.log(`[Contract Interaction] Contract instance obtained`);
    
    // Ensure we have a valid number before proceeding
    if (!amount || amount.trim() === "" || isNaN(Number(amount))) {
      console.error(`[Contract Interaction] Invalid amount: ${amount}`);
      throw new Error("Invalid amount: please enter a valid number");
    }
    
    // Parse the input amount safely
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.error(`[Contract Interaction] Non-positive amount: ${numericAmount}`);
      throw new Error("Amount must be a positive number");
    }
    
    // Convert to a fixed decimal string to avoid scientific notation
    // Format with up to 18 decimal places (Ethereum max precision)
    // This ensures numbers like 0.0001 don't become 1e-4
    const decimalPlaces = amount.includes('.') ? 
      amount.split('.')[1].length : 0;
    
    // Use fixed notation with appropriate precision
    const cleanAmount = numericAmount.toFixed(Math.min(18, decimalPlaces));
    
    console.log(`[Contract Interaction] Amount processing`);
    console.log(`[Contract Interaction] - Input amount: ${amount}`);
    console.log(`[Contract Interaction] - Parsed amount: ${numericAmount}`);
    console.log(`[Contract Interaction] - Decimal places: ${decimalPlaces}`);
    console.log(`[Contract Interaction] - Clean amount: ${cleanAmount}`);
    console.log(`[Contract Interaction] Investing in startup ${contractStartupId} with ${cleanAmount} ETH`);
    
    try {
      // If we have the actual startup information from the contract, log it
      if (contractStartupId > 0) {
        try {
          // Get startup information from the contract to confirm it exists
          const contractStartup = await contract.getStartup(contractStartupId);
          console.log(`[Contract Interaction] Startup info from contract:`, {
            id: contractStartup.id.toString(),
            founderAddress: contractStartup.founderAddress,
            name: contractStartup.name,
            fundingGoal: ethers.formatEther(contractStartup.fundingGoal),
            currentFunding: ethers.formatEther(contractStartup.currentFunding)
          });
          
          // If we have a founder wallet address from parameters, check if it matches the contract
          if (founderWalletAddress) {
            console.log(`[Contract Interaction] Checking founder wallet address:`, {
              providedAddress: founderWalletAddress,
              contractAddress: contractStartup.founderAddress,
              match: founderWalletAddress.toLowerCase() === contractStartup.founderAddress.toLowerCase()
            });
          }
        } catch (err) {
          console.log(`[Contract Interaction] Could not retrieve startup from contract: ${err}`);
        }
      }
      
      // Convert ETH amount to wei safely using a string that parseEther can handle
      const amountInWei = ethers.parseEther(cleanAmount);
      console.log(`[Contract Interaction] Amount in Wei: ${amountInWei.toString()}`);
      
      // Make the transaction
      console.log(`[Contract Interaction] Executing contract transaction...`);
      const tx = await contract.investInStartup(contractStartupId, { value: amountInWei });
      
      // Wait for the transaction to be mined
      console.log(`[Contract Interaction] Waiting for transaction to be mined: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`[Contract Interaction] Transaction mined in block ${receipt.blockNumber}`);
      
      // Return transaction details
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? "success" : "failed"
      };
    } catch (error: any) {
      console.error("[Contract Interaction] Error parsing or sending amount:", error);
      
      // Provide clearer error messages based on the error type
      const errorStr = String(error);
      if (errorStr.includes("underflow") || 
          errorStr.includes("overflow") ||
          errorStr.includes("INVALID_ARGUMENT")) {
        throw new Error(`Invalid amount format: Please enter a valid ETH amount between 0 and 1e18`);
      }
      
      throw new Error(`Failed to process transaction: ${error.message || errorStr}`);
    }
  } catch (error: any) {
    console.error("Error investing in startup:", error);
    
    // Handle common errors
    if (error.code === "ACTION_REJECTED") {
      throw new Error("Transaction was rejected by the user");
    } else if (error.message && error.message.includes("insufficient funds")) {
      throw new Error("Insufficient funds in your wallet to complete this transaction");
    } else if (error.message && error.message.includes("user rejected transaction")) {
      throw new Error("Transaction was rejected in MetaMask");
    } else if (error.message && error.message.includes("execution reverted")) {
      // Extract the revert reason if available
      const revertReasonMatch = error.message.match(/reason="([^"]+)"/);
      const revertReason = revertReasonMatch ? revertReasonMatch[1] : "Transaction was reverted by the contract";
      throw new Error(`Transaction failed: ${revertReason}`);
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