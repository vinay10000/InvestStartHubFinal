/**
 * Wallet address utilities for the client side
 * Provides reliable ways to fetch wallet addresses for startups and users
 */
// Helper function to make API requests
const apiRequest = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    return null;
  }
};

// Cache wallet addresses to minimize API calls
const walletCache = new Map<string, string>();

/**
 * Get a wallet address for a startup
 * This is more reliable than getting it from the startup object
 */
export async function getStartupWallet(startupId: number | string): Promise<string | null> {
  try {
    // Check cache first
    const cacheKey = `startup_${startupId}`;
    if (walletCache.has(cacheKey)) {
      console.log(`[wallet-utils] Using cached wallet for startup ${startupId}`);
      return walletCache.get(cacheKey) || null;
    }
    
    console.log(`[wallet-utils] Fetching wallet for startup ${startupId}`);
    const response = await apiRequest(`/api/wallets/startup/${startupId}`);
    const walletAddress = response?.walletAddress || null;
    
    if (walletAddress) {
      // Cache the result
      walletCache.set(cacheKey, walletAddress);
      console.log(`[wallet-utils] Found wallet for startup ${startupId}: ${walletAddress.substring(0, 10)}...`);
    } else {
      console.log(`[wallet-utils] No wallet found for startup ${startupId}`);
    }
    
    return walletAddress;
  } catch (error) {
    console.error(`[wallet-utils] Error fetching wallet for startup ${startupId}:`, error);
    return null;
  }
}

/**
 * Get a wallet address for a user
 */
export async function getUserWallet(userId: number | string): Promise<string | null> {
  try {
    // Check cache first
    const cacheKey = `user_${userId}`;
    if (walletCache.has(cacheKey)) {
      console.log(`[wallet-utils] Using cached wallet for user ${userId}`);
      return walletCache.get(cacheKey) || null;
    }
    
    console.log(`[wallet-utils] Fetching wallet for user ${userId}`);
    const response = await apiRequest(`/api/wallets/user/${userId}`);
    const walletAddress = response?.walletAddress || null;
    
    if (walletAddress) {
      // Cache the result
      walletCache.set(cacheKey, walletAddress);
      console.log(`[wallet-utils] Found wallet for user ${userId}: ${walletAddress.substring(0, 10)}...`);
    } else {
      console.log(`[wallet-utils] No wallet found for user ${userId}`);
    }
    
    return walletAddress;
  } catch (error) {
    console.error(`[wallet-utils] Error fetching wallet for user ${userId}:`, error);
    return null;
  }
}

/**
 * Find a user by wallet address
 */
export async function findUserByWallet(walletAddress: string): Promise<any | null> {
  try {
    console.log(`[wallet-utils] Looking up user with wallet ${walletAddress.substring(0, 10)}...`);
    const response = await apiRequest(`/api/wallets/address/${walletAddress}`);
    const user = response?.user || null;
    
    if (user) {
      console.log(`[wallet-utils] Found user for wallet ${walletAddress.substring(0, 10)}...`, user.username);
    } else {
      console.log(`[wallet-utils] No user found for wallet ${walletAddress.substring(0, 10)}...`);
    }
    
    return user;
  } catch (error) {
    console.error(`[wallet-utils] Error finding user for wallet ${walletAddress.substring(0, 10)}...:`, error);
    return null;
  }
}

/**
 * Clear wallet cache
 */
export function clearWalletCache(): void {
  walletCache.clear();
  console.log('[wallet-utils] Wallet cache cleared');
}