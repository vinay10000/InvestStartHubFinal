import { getDatabase, ref, set, get, remove, onValue, update } from 'firebase/database';
import { app } from './config';

// Initialize Firebase Realtime Database
const database = getDatabase(app);

// Type for wallet data
export interface WalletData {
  address: string;
  userId: number;
  username: string;
  isPermanent: boolean;
  timestamp: number;
}

/**
 * Associates a wallet address with a user ID in Firebase
 */
export const addWalletAddress = async (
  address: string, 
  userId: number, 
  username: string,
  isPermanent: boolean = false
): Promise<void> => {
  try {
    const walletRef = ref(database, `wallets/${address.toLowerCase()}`);
    
    // Check if wallet already exists
    const snapshot = await get(walletRef);
    if (snapshot.exists()) {
      const existingData = snapshot.val();
      // If the wallet is already registered to another user, throw error
      if (existingData.userId !== userId) {
        throw new Error('This wallet address is already associated with another account');
      }
    }
    
    // Store the wallet data
    await set(walletRef, {
      address: address.toLowerCase(),
      userId,
      username,
      isPermanent,
      timestamp: Date.now()
    });
    
    // Also store in user-indexed location for easy lookup by user
    await set(ref(database, `users/${userId}/wallet`), {
      address: address.toLowerCase(),
      isPermanent,
      timestamp: Date.now()
    });
    
    console.log(`[Wallet DB] Wallet ${address} registered for user ${userId}`);
  } catch (error) {
    console.error('[Wallet DB] Error registering wallet:', error);
    throw error;
  }
};

/**
 * Removes a wallet address association
 */
export const removeWalletAddress = async (address: string, userId: number): Promise<void> => {
  try {
    const walletRef = ref(database, `wallets/${address.toLowerCase()}`);
    
    // Check if the wallet belongs to this user and is not permanent
    const snapshot = await get(walletRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.userId !== userId) {
        throw new Error('This wallet is not associated with your account');
      }
      
      if (data.isPermanent) {
        throw new Error('This wallet address is set as permanent and cannot be removed');
      }
      
      // Remove the wallet address
      await remove(walletRef);
      
      // Also remove from user record
      await remove(ref(database, `users/${userId}/wallet`));
      
      console.log(`[Wallet DB] Wallet ${address} removed for user ${userId}`);
    }
  } catch (error) {
    console.error('[Wallet DB] Error removing wallet:', error);
    throw error;
  }
};

/**
 * Updates a wallet to be permanent (cannot be changed)
 */
export const makeWalletPermanent = async (address: string, userId: number): Promise<void> => {
  try {
    const walletRef = ref(database, `wallets/${address.toLowerCase()}`);
    
    // Check if the wallet belongs to this user
    const snapshot = await get(walletRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.userId !== userId) {
        throw new Error('This wallet is not associated with your account');
      }
      
      // Update the wallet record
      const updatedData = {
        ...data,
        isPermanent: true
      };
      
      await set(walletRef, updatedData);
      
      // Also update user record
      await set(ref(database, `users/${userId}/wallet`), {
        address: address.toLowerCase(),
        isPermanent: true,
        timestamp: data.timestamp
      });
      
      console.log(`[Wallet DB] Wallet ${address} marked as permanent for user ${userId}`);
    } else {
      throw new Error('Wallet not found');
    }
  } catch (error) {
    console.error('[Wallet DB] Error marking wallet as permanent:', error);
    throw error;
  }
};

/**
 * Gets wallet data for a user
 */
export const getUserWallet = async (userId: number): Promise<WalletData | null> => {
  try {
    console.log(`[Wallet DB] Getting wallet for user ID: ${userId}`);
    
    // First try to get from user-indexed location
    const userWalletRef = ref(database, `users/${userId}/wallet`);
    const snapshot = await get(userWalletRef);
    
    if (snapshot.exists()) {
      const walletData = snapshot.val();
      console.log(`[Wallet DB] Found wallet reference in user record:`, walletData);
      
      // Get the full wallet data
      const walletRef = ref(database, `wallets/${walletData.address.toLowerCase()}`);
      const walletSnapshot = await get(walletRef);
      
      if (walletSnapshot.exists()) {
        console.log(`[Wallet DB] Found full wallet data:`, walletSnapshot.val());
        return walletSnapshot.val() as WalletData;
      } else {
        console.log(`[Wallet DB] Wallet reference exists but full wallet data not found`);
      }
    } else {
      console.log(`[Wallet DB] No wallet reference found in user record for ID: ${userId}`);
    }
    
    // If we didn't find it in the user record, try direct lookup by address
    // This is a fallback for older data structures
    console.log(`[Wallet DB] Trying direct wallet lookup for user ID: ${userId}`);
    
    // Get all wallets and filter by userId
    const walletsRef = ref(database, 'wallets');
    const walletsSnapshot = await get(walletsRef);
    
    if (walletsSnapshot.exists()) {
      const wallets = walletsSnapshot.val();
      console.log(`[Wallet DB] Found ${Object.keys(wallets).length} total wallets in database`);
      
      // Find wallet with matching userId
      for (const address in wallets) {
        const wallet = wallets[address];
        if (wallet.userId === userId) {
          console.log(`[Wallet DB] Found wallet by direct lookup:`, wallet);
          return wallet as WalletData;
        }
      }
      
      console.log(`[Wallet DB] No wallet found with userId: ${userId}`);
    } else {
      console.log(`[Wallet DB] No wallets found in database`);
    }
    
    return null;
  } catch (error) {
    console.error('[Wallet DB] Error getting user wallet:', error);
    return null;
  }
};

/**
 * Gets wallet data by address
 */
export const getWalletByAddress = async (address: string): Promise<WalletData | null> => {
  try {
    const walletRef = ref(database, `wallets/${address.toLowerCase()}`);
    const snapshot = await get(walletRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as WalletData;
    }
    
    return null;
  } catch (error) {
    console.error('[Wallet DB] Error getting wallet by address:', error);
    return null;
  }
};

/**
 * Checks if a wallet address is available (not registered to any user)
 */
export const isWalletAvailable = async (address: string): Promise<boolean> => {
  try {
    const walletRef = ref(database, `wallets/${address.toLowerCase()}`);
    const snapshot = await get(walletRef);
    
    return !snapshot.exists();
  } catch (error) {
    console.error('[Wallet DB] Error checking wallet availability:', error);
    return false;
  }
};

/**
 * Sets up a listener for wallet changes for a user
 */
export const listenToUserWallet = (
  userId: number, 
  callback: (walletData: WalletData | null) => void
): (() => void) => {
  const userWalletRef = ref(database, `users/${userId}/wallet`);
  
  const unsubscribe = onValue(userWalletRef, async (snapshot) => {
    if (snapshot.exists()) {
      const walletData = snapshot.val();
      
      // Get the full wallet data
      const walletRef = ref(database, `wallets/${walletData.address.toLowerCase()}`);
      const walletSnapshot = await get(walletRef);
      
      if (walletSnapshot.exists()) {
        callback(walletSnapshot.val() as WalletData);
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
};

/**
 * Initialize the database connection and verify it's working
 */
export const initializeWalletDatabase = async (): Promise<boolean> => {
  try {
    // Try to read a value to check connection
    const testRef = ref(database, '.info/connected');
    
    return new Promise((resolve) => {
      const unsubscribe = onValue(testRef, (snapshot) => {
        unsubscribe();
        console.log('[Wallet DB] Database initialization status:', snapshot.val());
        resolve(!!snapshot.val());
      }, (error) => {
        console.error('[Wallet DB] Database initialization error:', error);
        resolve(false);
      });
      
      // Set a timeout in case we never get a response
      setTimeout(() => {
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    console.error('[Wallet DB] Error initializing database:', error);
    return false;
  }
};

/**
 * Saves a wallet address directly to a startup's data
 * This ensures the founder's wallet is properly associated with the startup
 */
export const saveWalletToStartup = async (
  startupId: string | number,
  walletAddress: string,
  founderName?: string
): Promise<boolean> => {
  try {
    console.log(`[Wallet DB] Saving wallet ${walletAddress} to startup ${startupId}`);
    
    // Update the startup data with the wallet address
    const startupRef = ref(database, `startups/${startupId}`);
    
    // Prepare the update data
    const updateData: Record<string, any> = {
      founderWalletAddress: walletAddress.toLowerCase()
    };
    
    // Add founder name if provided
    if (founderName) {
      updateData.founderName = founderName;
    }
    
    // Update the startup data
    await update(startupRef, updateData);
    
    console.log(`[Wallet DB] Successfully saved wallet to startup ${startupId}`);
    return true;
  } catch (error) {
    console.error(`[Wallet DB] Error saving wallet to startup:`, error);
    return false;
  }
};