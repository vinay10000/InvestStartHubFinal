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
 * Get a wallet address for a startup from MongoDB
 */
export async function getStartupWallet(startupId: string): Promise<string> {
  console.log(`[getStartupWallet] Getting wallet for startup ${startupId}`);
  
  try {
    const wallet = await getStartupWalletFromMongoDB(startupId);
    if (wallet) {
      console.log(`[getStartupWallet] Found wallet in MongoDB: ${wallet}`);
      return wallet;
    }
    
    console.log(`[getStartupWallet] No wallet found for startup ${startupId} in MongoDB`);
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
  
  try {
    const wallet = await getUserWalletFromMongoDB(userId);
    if (wallet) {
      console.log(`[getUserWallet] Found wallet in MongoDB: ${wallet}`);
      return wallet;
    }
    
    console.log(`[getUserWallet] No wallet found for user ${userId} in MongoDB`);
    return ""; // Return empty string as fallback
  } catch (error) {
    console.error(`[getUserWallet] Error getting wallet for user ${userId}:`, error);
    return ""; // Return empty string as fallback
  }
}