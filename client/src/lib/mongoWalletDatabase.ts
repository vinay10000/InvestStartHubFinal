/**
 * MongoDB Wallet Database Access
 * 
 * This file provides functions to interact with wallet data in MongoDB.
 * It completely replaces the Firebase wallet database implementation.
 */

// Define wallet data interface
export interface WalletData {
  address: string;
  userId: number | string;
  username: string;
  isPermanent: boolean;
  timestamp: number;
}

/**
 * Get the wallet address for a specific user
 */
export async function getUserWallet(userId: number | string): Promise<WalletData | null> {
  try {
    const response = await fetch(`/api/wallets/user/${userId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Wallet not found
      }
      throw new Error(`Error fetching wallet: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.walletAddress) {
      return null;
    }
    
    // Get user details to complete the wallet data
    const userResponse = await fetch(`/api/user/profile?userId=${userId}`);
    if (!userResponse.ok) {
      throw new Error(`Error fetching user profile: ${userResponse.statusText}`);
    }
    
    const user = await userResponse.json();
    
    return {
      address: data.walletAddress,
      userId: userId,
      username: user.username || 'Unknown User',
      isPermanent: data.isPermanent || false,
      timestamp: data.timestamp || Date.now()
    };
  } catch (error) {
    console.error('Error getting user wallet:', error);
    throw error;
  }
}

/**
 * Check if a wallet address is available (not already in use)
 */
export async function isWalletAvailable(walletAddress: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/wallets/address/${walletAddress}`);
    
    if (response.status === 404) {
      return true; // Wallet not found, so it's available
    }
    
    if (!response.ok) {
      throw new Error(`Error checking wallet availability: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // If the API returns a userId, the wallet is already associated with a user
    return !data.userId;
  } catch (error) {
    console.error('Error checking wallet availability:', error);
    throw error;
  }
}

/**
 * Add a wallet address for a user
 */
export async function addWalletAddress(
  walletAddress: string,
  userId: number | string, 
  username: string, 
  isPermanent: boolean = false
): Promise<void> {
  try {
    const response = await fetch('/api/user/wallet/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        walletAddress,
        isPermanent
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to connect wallet: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error adding wallet address:', error);
    throw error;
  }
}

/**
 * Make a wallet address permanent for a user
 */
export async function makeWalletPermanent(walletAddress: string, userId: number | string): Promise<void> {
  try {
    const response = await fetch('/api/user/wallet/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        walletAddress,
        isPermanent: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to make wallet permanent: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error making wallet permanent:', error);
    throw error;
  }
}