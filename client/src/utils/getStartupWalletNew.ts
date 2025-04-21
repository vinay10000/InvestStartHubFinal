/**
 * New module for wallet lookups
 * This module provides hybrid lookup capabilities using both MongoDB and Firestore
 * for reliable wallet discovery.
 */
import { getStartupWalletFromMongoDB, getUserWalletFromMongoDB } from './mongoWalletUtils';

// Existing Firestore-based wallet lookup imports
const getStartupWalletFromFirebase = async (startupId: string): Promise<string | null> => {
  try {
    const response = await fetch(`/api/wallets/startup/${startupId}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[getStartupWalletNew] No wallet found for startup ${startupId} in Firestore`);
        return null;
      }
      throw new Error(`Error fetching wallet from Firestore: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[getStartupWalletNew] Found wallet for startup ${startupId} in Firestore:`, data.walletAddress);
    return data.walletAddress;
  } catch (error) {
    console.error(`[getStartupWalletNew] Error fetching wallet from Firestore for startup ${startupId}:`, error);
    return null;
  }
};

const getUserWalletFromFirebase = async (userId: string): Promise<string | null> => {
  try {
    const response = await fetch(`/api/wallets/user/${userId}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[getStartupWalletNew] No wallet found for user ${userId} in Firestore`);
        return null;
      }
      throw new Error(`Error fetching wallet from Firestore: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[getStartupWalletNew] Found wallet for user ${userId} in Firestore:`, data.walletAddress);
    return data.walletAddress;
  } catch (error) {
    console.error(`[getStartupWalletNew] Error fetching wallet from Firestore for user ${userId}:`, error);
    return null;
  }
};

/**
 * Get a wallet address for a startup, trying MongoDB first, then Firestore
 */
export async function getStartupWallet(startupId: string): Promise<string> {
  console.log(`[getStartupWalletNew] Getting wallet for startup ${startupId}`);
  
  try {
    // First try MongoDB
    const mongoWallet = await getStartupWalletFromMongoDB(startupId);
    if (mongoWallet) {
      console.log(`[getStartupWalletNew] Found wallet in MongoDB: ${mongoWallet}`);
      return mongoWallet;
    }
    
    // Then try Firestore
    const firebaseWallet = await getStartupWalletFromFirebase(startupId);
    if (firebaseWallet) {
      console.log(`[getStartupWalletNew] Found wallet in Firestore: ${firebaseWallet}`);
      return firebaseWallet;
    }
    
    console.log(`[getStartupWalletNew] No wallet found for startup ${startupId} in any database`);
    return ""; // Return empty string as fallback
  } catch (error) {
    console.error(`[getStartupWalletNew] Error getting wallet for startup ${startupId}:`, error);
    return ""; // Return empty string as fallback
  }
}

/**
 * Get a wallet address for a user, trying MongoDB first, then Firestore
 */
export async function getUserWallet(userId: string): Promise<string> {
  console.log(`[getStartupWalletNew] Getting wallet for user ${userId}`);
  
  try {
    // First try MongoDB
    const mongoWallet = await getUserWalletFromMongoDB(userId);
    if (mongoWallet) {
      console.log(`[getStartupWalletNew] Found wallet in MongoDB: ${mongoWallet}`);
      return mongoWallet;
    }
    
    // Then try Firestore
    const firebaseWallet = await getUserWalletFromFirebase(userId);
    if (firebaseWallet) {
      console.log(`[getStartupWalletNew] Found wallet in Firestore: ${firebaseWallet}`);
      return firebaseWallet;
    }
    
    console.log(`[getStartupWalletNew] No wallet found for user ${userId} in any database`);
    return ""; // Return empty string as fallback
  } catch (error) {
    console.error(`[getStartupWalletNew] Error getting wallet for user ${userId}:`, error);
    return ""; // Return empty string as fallback
  }
}