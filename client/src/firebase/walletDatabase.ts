import { ref, set, get, child, Database, getDatabase, onValue } from 'firebase/database';
import { database } from './config';

// We now have properly typed database imports from config.ts
// For compatibility with existing code, cast to Database type
const db: Database = database as Database;

// Add this line for debugging
console.log("[Wallet DB] Database initialization status:", !!db);

// Cache for wallet addresses from Firebase to avoid frequent lookups
// This will be populated only with real data from the database
let lastSavedWalletAddress: Record<string, string> = {};

// Add a simple function to get the wallet synchronously
export const getLastSavedWalletAddress = (userId: string): string | null => {
  return lastSavedWalletAddress[userId] || null;
};

/**
 * Helper function to migrate wallet data from numeric IDs to Firebase UIDs
 * This can be used when a wallet is found with a numeric ID but needs to be 
 * associated with a real Firebase UID
 */
export const migrateWalletToFirebaseUid = async (
  numericId: string, 
  firebaseUid: string,
  walletAddress: string
): Promise<boolean> => {
  try {
    console.log(`[Wallet DB] Migrating wallet from numeric ID ${numericId} to Firebase UID ${firebaseUid}`);
    
    // First check if we already have a wallet for this Firebase UID
    const existingWallet = await getWalletByUserId(firebaseUid);
    if (existingWallet) {
      console.log(`[Wallet DB] Firebase UID ${firebaseUid} already has a wallet, no migration needed`);
      return true; // No need to migrate
    }
    
    // Get the wallet data from the numeric ID
    const oldWallet = await getWalletByUserId(numericId);
    if (!oldWallet) {
      console.log(`[Wallet DB] No wallet found for numeric ID ${numericId}, nothing to migrate`);
      return false;
    }
    
    // Create new wallet entry with Firebase UID
    const now = Date.now();
    const walletData: WalletData = {
      address: walletAddress || oldWallet.address,
      userId: firebaseUid,
      userName: oldWallet.userName,
      role: oldWallet.role,
      createdAt: oldWallet.createdAt || now,
      updatedAt: now
    };
    
    // Save the new wallet entry
    const walletRef = ref(db, `${WALLETS_PATH}/${firebaseUid}`);
    await set(walletRef, walletData);
    
    // Update the wallet address index to point to the Firebase UID
    const addressRef = ref(db, `wallet_addresses/${walletData.address.toLowerCase()}`);
    await set(addressRef, { userId: firebaseUid, updatedAt: now });
    
    // Store in cache
    lastSavedWalletAddress[firebaseUid] = walletData.address;
    
    console.log(`[Wallet DB] Successfully migrated wallet from numeric ID ${numericId} to Firebase UID ${firebaseUid}`);
    
    // Optionally, remove the old wallet entry
    // Only uncomment this when you're sure the migration is working correctly
    // const oldWalletRef = ref(db, `${WALLETS_PATH}/${numericId}`);
    // await set(oldWalletRef, null);
    
    return true;
  } catch (error) {
    console.error(`[Wallet DB] Error migrating wallet from ${numericId} to ${firebaseUid}:`, error);
    return false;
  }
};

// Interface for wallet data structure
export interface WalletData {
  address: string;
  userId: string;
  userName?: string;
  role?: string;
  createdAt: number;
  updatedAt: number;
}

// Path to wallets in Firebase Realtime Database
const WALLETS_PATH = 'wallets';

/**
 * Save wallet address for a user
 * 
 * @param userId The Firebase UID of the user (prioritize using this, not numeric IDs)
 * @param walletAddress The Ethereum wallet address
 * @param userName Optional username
 * @param role Optional user role
 */
export const saveWalletAddress = async (
  userId: string,
  walletAddress: string,
  userName?: string,
  role?: string
): Promise<void> => {
  try {
    if (!userId) {
      console.error('[Wallet DB] Cannot save wallet: userId is empty');
      throw new Error('User ID is required to save wallet address');
    }
    
    const now = Date.now();
    const walletData: WalletData = {
      address: walletAddress,
      userId,
      userName,
      role,
      createdAt: now,
      updatedAt: now
    };

    // Create a reference to the user's wallet
    const walletRef = ref(db, `${WALLETS_PATH}/${userId}`);
    
    // Store the wallet data
    await set(walletRef, walletData);
    
    // Save to in-memory cache for immediate use
    lastSavedWalletAddress[userId] = walletAddress;
    
    console.log(`[Wallet DB] Saved wallet address for user ${userId}: ${walletAddress}`);
    
    // Also store in an index by wallet address for reverse lookup
    // This is critical for finding the wallet owner by address
    const addressRef = ref(db, `wallet_addresses/${walletAddress.toLowerCase()}`);
    await set(addressRef, { userId, updatedAt: now });
    
    return;
  } catch (error) {
    console.error('[Wallet DB] Error saving wallet address:', error);
    throw error;
  }
};

/**
 * Get wallet data for a user
 */
export const getWalletByUserId = async (userId: string): Promise<WalletData | null> => {
  try {
    if (!userId) {
      console.log(`[Wallet DB] No userId provided`);
      return null;
    }
    
    // Enhanced logging to help debug wallet retrieval
    console.log(`[Wallet DB] Looking up wallet for userId: ${userId}`);
    
    // Check in-memory cache first for instant access
    const cachedAddress = lastSavedWalletAddress[userId];
    if (cachedAddress) {
      console.log(`[Wallet DB] Found cached wallet for user ${userId}: ${cachedAddress}`);
      // Return a minimal wallet object with the cached address
      return {
        address: cachedAddress,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }
    
    // If not in cache, check Firebase
    try {
      console.log(`[Wallet DB] Checking Firebase for wallet at path: ${WALLETS_PATH}/${userId}`);
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `${WALLETS_PATH}/${userId}`));
      
      if (snapshot.exists()) {
        console.log(`[Wallet DB] Found wallet in Firebase for user ${userId}`);
        const walletData = snapshot.val() as WalletData;
        
        // Update in-memory cache for future use
        if (walletData && walletData.address) {
          console.log(`[Wallet DB] Caching wallet address for quick access: ${walletData.address}`);
          lastSavedWalletAddress[userId] = walletData.address;
        }
        
        return walletData;
      }
      
      // Try looking up with a different path format - some Firebase DBs use different paths
      console.log(`[Wallet DB] No wallet at primary path, trying alternative: wallets/${userId}`);
      const altSnapshot = await get(child(dbRef, `wallets/${userId}`));
      
      if (altSnapshot.exists()) {
        console.log(`[Wallet DB] Found wallet in Firebase at alternative path for user ${userId}`);
        const walletData = altSnapshot.val() as WalletData;
        
        // Update in-memory cache for future use
        if (walletData && walletData.address) {
          console.log(`[Wallet DB] Caching wallet address: ${walletData.address}`);
          lastSavedWalletAddress[userId] = walletData.address;
        }
        
        return walletData;
      }
    } catch (innerError) {
      console.error('[Wallet DB] Error accessing Firebase for wallet data:', innerError);
      // Continue to try other methods even if Firebase lookup fails
    }
    
    // At this point, no wallet was found in any source
    console.log(`[Wallet DB] No wallet found for user ${userId} after all lookups`);
    return null;
  } catch (error) {
    console.error('[Wallet DB] Error getting wallet:', error);
    return null;
  }
};

/**
 * Get user ID by wallet address
 * Returns the Firebase UID associated with a given wallet address
 */
export const getUserIdByWalletAddress = async (walletAddress: string): Promise<string | null> => {
  try {
    if (!walletAddress) {
      console.log('[Wallet DB] No wallet address provided for lookup');
      return null;
    }
    
    // Normalize the wallet address to lowercase for consistent lookups
    const normalizedAddress = walletAddress.toLowerCase();
    console.log(`[Wallet DB] Looking up user for wallet address: ${normalizedAddress}`);
    
    // Create a reference to the address index
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `wallet_addresses/${normalizedAddress}`));
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log(`[Wallet DB] Found user ${data.userId} for wallet address ${normalizedAddress}`);
      
      // Check if the userId is a numeric value (old format) or Firebase UID (preferred)
      // Numeric user IDs typically don't look like Firebase UIDs (which are longer and contain letters)
      if (data.userId && !isNaN(Number(data.userId)) && data.userId.length < 10) {
        console.log(`[Wallet DB] Warning: Found numeric user ID (${data.userId}) for wallet. This should be updated to Firebase UID.`);
      }
      
      return data.userId;
    }
    
    console.log(`[Wallet DB] No user found for wallet address ${normalizedAddress}`);
    return null;
  } catch (error) {
    console.error('[Wallet DB] Error getting user by wallet address:', error);
    return null;
  }
};

/**
 * Get wallet data by wallet address - useful for finding founder wallet info
 */
export const getWalletByAddress = async (walletAddress: string): Promise<WalletData | null> => {
  try {
    // First get the user ID associated with this wallet address
    const userId = await getUserIdByWalletAddress(walletAddress);
    
    if (!userId) {
      console.log(`[Wallet DB] No user found for wallet address ${walletAddress}`);
      return null;
    }
    
    // Then get the wallet data for that user
    return getWalletByUserId(userId);
  } catch (error) {
    console.error('[Wallet DB] Error getting wallet by address:', error);
    return null;
  }
};

/**
 * Get all wallets from the database
 */
export const getAllWallets = async (): Promise<Record<string, WalletData>> => {
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, WALLETS_PATH));
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return {};
  } catch (error) {
    console.error('[Wallet DB] Error getting all wallets:', error);
    return {};
  }
};

/**
 * Update wallet address for a user
 */
export const updateWalletAddress = async (
  userId: string,
  walletAddress: string
): Promise<void> => {
  try {
    // Get the existing wallet data first
    const existingWallet = await getWalletByUserId(userId);
    
    // If there's an existing wallet address, remove it from the address index
    if (existingWallet && existingWallet.address) {
      const oldAddressRef = ref(db, `wallet_addresses/${existingWallet.address.toLowerCase()}`);
      await set(oldAddressRef, null);
    }
    
    // Update with the new address
    const now = Date.now();
    const walletRef = ref(db, `${WALLETS_PATH}/${userId}`);
    
    await set(walletRef, {
      ...(existingWallet || {}),
      address: walletAddress,
      updatedAt: now
    });
    
    // Update the address index
    const addressRef = ref(db, `wallet_addresses/${walletAddress.toLowerCase()}`);
    await set(addressRef, { userId, updatedAt: now });
    
    // Also update in-memory cache
    lastSavedWalletAddress[userId] = walletAddress;
    
    console.log(`[Wallet DB] Updated wallet address for user ${userId}: ${walletAddress}`);
    return;
  } catch (error) {
    console.error('[Wallet DB] Error updating wallet address:', error);
    throw error;
  }
};

/**
 * Delete wallet for a user
 */
export const deleteWallet = async (userId: string): Promise<void> => {
  try {
    // Get the existing wallet data first to remove from address index
    const existingWallet = await getWalletByUserId(userId);
    
    // If there's an existing wallet address, remove it from the address index
    if (existingWallet && existingWallet.address) {
      const addressRef = ref(db, `wallet_addresses/${existingWallet.address.toLowerCase()}`);
      await set(addressRef, null);
    }
    
    // Remove the wallet data
    const walletRef = ref(db, `${WALLETS_PATH}/${userId}`);
    await set(walletRef, null);
    
    console.log(`[Wallet DB] Deleted wallet for user ${userId}`);
    return;
  } catch (error) {
    console.error('[Wallet DB] Error deleting wallet:', error);
    throw error;
  }
};

// Fallback mechanism for when database connection fails
const fallbackWallets: Record<string, WalletData> = {};

/**
 * Try to get wallet from fallback storage if DB fails
 */
export const getWalletFromFallback = (userId: string): WalletData | null => {
  return fallbackWallets[userId] || null;
};

/**
 * Save to fallback storage in case DB fails
 */
export const saveWalletToFallback = (userId: string, walletData: WalletData): void => {
  fallbackWallets[userId] = walletData;
};