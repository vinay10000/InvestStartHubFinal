/**
 * Wallet lookup module using MongoDB exclusively
 * This module replaces the hybrid Firebase/MongoDB implementation
 * with a MongoDB-only solution for wallet discovery
 */

/**
 * Get a wallet address for a startup from MongoDB
 */
const getStartupWalletFromMongoDB = async (startupId: string): Promise<string | null> => {
  try {
    const response = await fetch(`/api/wallets/startup/${startupId}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[getStartupWallet] No wallet found for startup ${startupId} in MongoDB`);
        return null;
      }
      throw new Error(`Error fetching wallet from MongoDB: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[getStartupWallet] Found wallet for startup ${startupId} in MongoDB:`, data.walletAddress);
    return data.walletAddress;
  } catch (error) {
    console.error(`[getStartupWallet] Error fetching wallet from MongoDB for startup ${startupId}:`, error);
    return null;
  }
};

/**
 * Get a wallet address for a user from MongoDB
 */
const getUserWalletFromMongoDB = async (userId: string): Promise<string | null> => {
  try {
    const response = await fetch(`/api/wallets/user/${userId}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[getStartupWallet] No wallet found for user ${userId} in MongoDB`);
        return null;
      }
      throw new Error(`Error fetching wallet from MongoDB: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[getStartupWallet] Found wallet for user ${userId} in MongoDB:`, data.walletAddress);
    return data.walletAddress;
  } catch (error) {
    console.error(`[getStartupWallet] Error fetching wallet from MongoDB for user ${userId}:`, error);
    return null;
  }
};

/**
 * Validates if a string is a valid Ethereum wallet address
 */
function isValidEthereumAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get a wallet address for a startup from MongoDB
 */
export async function getStartupWallet(startupId: string): Promise<string> {
  console.log(`[getStartupWallet] Getting wallet for startup ${startupId}`);
  
  try {
    // Normalize the startup ID
    const normalizedStartupId = startupId.toString().trim();
    
    // Try the direct MongoDB lookup first
    const wallet = await getStartupWalletFromMongoDB(normalizedStartupId);
    
    // Validate the wallet address
    if (wallet && isValidEthereumAddress(wallet)) {
      console.log(`[getStartupWallet] Found valid wallet in MongoDB: ${wallet}`);
      return wallet;
    }
    
    // If we don't have a valid wallet yet, try getting the startup to find the founder
    try {
      const startupResponse = await fetch(`/api/startups/${normalizedStartupId}`);
      if (startupResponse.ok) {
        const startup = await startupResponse.json();
        
        // If startup has founderId, try getting founder's wallet
        if (startup && startup.founderId) {
          console.log(`[getStartupWallet] Trying to get wallet from founder ID: ${startup.founderId}`);
          const founderWallet = await getUserWalletFromMongoDB(startup.founderId.toString());
          
          if (founderWallet && isValidEthereumAddress(founderWallet)) {
            console.log(`[getStartupWallet] Found valid wallet from founder: ${founderWallet}`);
            return founderWallet;
          }
        }
      }
    } catch (startupError) {
      console.warn(`[getStartupWallet] Error getting startup details: ${startupError}`);
      // Continue to fallback
    }
    
    console.log(`[getStartupWallet] No valid wallet found for startup ${startupId}`);
    return ""; // Return empty string as fallback
  } catch (error) {
    console.error(`[getStartupWallet] Error getting wallet for startup ${startupId}:`, error);
    return ""; // Return empty string as fallback
  }
}

/**
 * Get a wallet address for a user from MongoDB
 */
export async function getUserWallet(userId: string): Promise<string> {
  console.log(`[getUserWallet] Getting wallet for user ${userId}`);
  
  if (!userId) {
    console.log(`[getUserWallet] No userId provided`);
    return "";
  }
  
  try {
    // Normalize the user ID
    const normalizedUserId = userId.toString().trim();
    
    // Try to get the user's wallet from MongoDB
    const wallet = await getUserWalletFromMongoDB(normalizedUserId);
    
    // Validate the wallet address
    if (wallet && isValidEthereumAddress(wallet)) {
      console.log(`[getUserWallet] Found valid wallet in MongoDB: ${wallet}`);
      return wallet;
    }
    
    console.log(`[getUserWallet] No valid wallet found for user ${userId}`);
    return ""; // Return empty string as fallback
  } catch (error) {
    console.error(`[getUserWallet] Error getting wallet for user ${userId}:`, error);
    return ""; // Return empty string as fallback
  }
}