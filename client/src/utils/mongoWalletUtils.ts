/**
 * MongoDB Wallet Utilities
 * Client-side utils for interacting with the MongoDB wallet API
 */

/**
 * Get a wallet address for a startup from MongoDB
 */
export async function getStartupWalletFromMongoDB(startupId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/wallets/startup/${startupId}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[mongoWalletUtils] No wallet found for startup ${startupId} in MongoDB`);
        return null;
      }
      throw new Error(`Error fetching wallet from MongoDB API: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data && data.walletAddress) {
      console.log(`[mongoWalletUtils] Found wallet for startup ${startupId} in MongoDB:`, data.walletAddress);
      return data.walletAddress;
    }
    
    console.log(`[mongoWalletUtils] No wallet address in MongoDB response for startup ${startupId}`);
    return null;
  } catch (error) {
    console.error(`[mongoWalletUtils] Error fetching wallet from MongoDB for startup ${startupId}:`, error);
    return null;
  }
}

/**
 * Get a wallet address for a user from MongoDB
 */
export async function getUserWalletFromMongoDB(userId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/wallets/user/${userId}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[mongoWalletUtils] No wallet found for user ${userId} in MongoDB`);
        return null;
      }
      throw new Error(`Error fetching wallet from MongoDB API: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data && data.walletAddress) {
      console.log(`[mongoWalletUtils] Found wallet for user ${userId} in MongoDB:`, data.walletAddress);
      return data.walletAddress;
    }
    
    console.log(`[mongoWalletUtils] No wallet address in MongoDB response for user ${userId}`);
    return null;
  } catch (error) {
    console.error(`[mongoWalletUtils] Error fetching wallet from MongoDB for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get a user ID by wallet address from MongoDB
 */
export async function getUserIdByWalletAddressFromMongoDB(walletAddress: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/wallets/address/${walletAddress}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[mongoWalletUtils] No user found for wallet ${walletAddress} in MongoDB`);
        return null;
      }
      throw new Error(`Error fetching user from MongoDB API: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data && data.userId) {
      console.log(`[mongoWalletUtils] Found user ${data.userId} for wallet ${walletAddress} in MongoDB`);
      return data.userId;
    }
    
    console.log(`[mongoWalletUtils] No user ID in MongoDB response for wallet ${walletAddress}`);
    return null;
  } catch (error) {
    console.error(`[mongoWalletUtils] Error fetching user by wallet from MongoDB for wallet ${walletAddress}:`, error);
    return null;
  }
}