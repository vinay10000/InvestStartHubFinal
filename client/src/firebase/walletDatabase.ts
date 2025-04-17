import { ref, set, get, child, Database, getDatabase, onValue } from 'firebase/database';
import { database } from './config';

// We now have properly typed database imports from config.ts
// For compatibility with existing code, cast to Database type
const db: Database = database as Database;

// Add this line for debugging
console.log("[Wallet DB] Database initialization status:", !!db);

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
 */
export const saveWalletAddress = async (
  userId: string,
  walletAddress: string,
  userName?: string,
  role?: string
): Promise<void> => {
  try {
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
    
    console.log(`[Wallet DB] Saved wallet address for user ${userId}: ${walletAddress}`);
    
    // Also store in an index by wallet address for reverse lookup
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
    // Create a reference to the user's wallet
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `${WALLETS_PATH}/${userId}`));
    
    if (snapshot.exists()) {
      return snapshot.val() as WalletData;
    }
    
    console.log(`[Wallet DB] No wallet found for user ${userId}`);
    return null;
  } catch (error) {
    console.error('[Wallet DB] Error getting wallet:', error);
    return null;
  }
};

/**
 * Get user ID by wallet address
 */
export const getUserIdByWalletAddress = async (walletAddress: string): Promise<string | null> => {
  try {
    // Create a reference to the address index
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `wallet_addresses/${walletAddress.toLowerCase()}`));
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return data.userId;
    }
    
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