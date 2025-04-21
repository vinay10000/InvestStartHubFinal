// MongoDB-compatible wallet database mock
// Import from our database mocks instead of Firebase
import { getDatabase, ref, set, get, remove, onValue, update } from './database';
import { database } from './config';

// Using the database instance from our config mock
console.log("[Wallet DB] Using MongoDB-compatible mock");

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
 * Gets a wallet for a given user ID (string version, can handle both Firebase UIDs and numeric IDs)
 */
export const getWalletByUserId = async (userId: string): Promise<WalletData | null> => {
  try {
    console.log(`[Wallet DB] Getting wallet for user ID (string) ${userId}`);
    
    // First try to get wallet directly from Firebase user data
    const userWalletRef = ref(database, `users/${userId}/wallet`);
    const snapshot = await get(userWalletRef);
    
    if (snapshot.exists()) {
      const walletData = snapshot.val();
      console.log(`[Wallet DB] Found wallet in users/${userId}/wallet:`, walletData);
      
      if (walletData.address) {
        // Fetch full wallet data from main wallets collection
        const walletRef = ref(database, `wallets/${walletData.address.toLowerCase()}`);
        const walletSnapshot = await get(walletRef);
        
        if (walletSnapshot.exists()) {
          return walletSnapshot.val() as WalletData;
        }
        
        // If wallet exists in user data but not in main collection,
        // construct a basic wallet object to return
        return {
          address: walletData.address.toLowerCase(),
          userId: parseInt(userId) || 0,
          username: 'User',
          isPermanent: walletData.isPermanent || false,
          timestamp: walletData.timestamp || Date.now()
        };
      }
    }
    
    // Also try looking for walletAddress directly in the user object
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      console.log(`[Wallet DB] Found user data in users/${userId}:`, userData);
      
      if (userData.walletAddress) {
        console.log(`[Wallet DB] Found walletAddress in user data:`, userData.walletAddress);
        
        // Check if it's already in the wallets collection
        const walletRef = ref(database, `wallets/${userData.walletAddress.toLowerCase()}`);
        const walletSnapshot = await get(walletRef);
        
        if (walletSnapshot.exists()) {
          return walletSnapshot.val() as WalletData;
        }
        
        // If not in wallets collection, create a temporary wallet object
        return {
          address: userData.walletAddress.toLowerCase(),
          userId: parseInt(userId) || 0,
          username: userData.username || 'User',
          isPermanent: true,
          timestamp: Date.now()
        };
      }
    }
    
    // No wallet found for this user
    console.log(`[Wallet DB] No wallet found for user ID ${userId}`);
    return null;
  } catch (error) {
    console.error('[Wallet DB] Error getting user wallet by string ID:', error);
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
    
    // Broadcast the wallet update via WebSocket to notify any investors viewing this startup
    try {
      // Only send if we're in a browser environment
      if (typeof window !== 'undefined') {
        // Get WebSocket URL based on current environment
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log(`[Wallet DB] Sending wallet update notification via WebSocket: ${startupId}:${walletAddress}`);
        
        // Create a new connection if we don't want to affect any existing ones
        const socket = new WebSocket(wsUrl);
        
        // Once connected, send the wallet update notification
        socket.addEventListener('open', () => {
          const message = {
            type: 'wallet_update',
            startupId: startupId,
            walletAddress: walletAddress.toLowerCase(),
            timestamp: Date.now()
          };
          
          socket.send(JSON.stringify(message));
          console.log('[Wallet DB] Wallet update notification sent via WebSocket');
          
          // Close the connection after sending
          setTimeout(() => socket.close(), 1000);
        });
        
        // Handle any errors
        socket.addEventListener('error', (error) => {
          console.error('[Wallet DB] WebSocket error when sending wallet update:', error);
        });
      }
    } catch (wsError) {
      // Don't let WebSocket issues affect the success of the wallet save operation
      console.error('[Wallet DB] Failed to send WebSocket notification:', wsError);
    }
    
    console.log(`[Wallet DB] Successfully saved wallet to startup ${startupId}`);
    return true;
  } catch (error) {
    console.error(`[Wallet DB] Error saving wallet to startup:`, error);
    return false;
  }
};

/**
 * Saves a wallet address to user's Firebase account
 */
export const saveWalletAddress = async (
  firebaseUid: string,
  walletAddress: string,
  username: string = '',
  role: string = '',
  startupId?: string // Optional parameter to link to startups
): Promise<boolean> => {
  try {
    console.log(`[Wallet DB] Saving wallet ${walletAddress} to Firebase user ${firebaseUid}`);
    
    // Save to Firebase user data
    const userRef = ref(database, `users/${firebaseUid}`);
    
    await update(userRef, {
      walletAddress: walletAddress.toLowerCase(),
      walletUpdatedAt: Date.now(),
      username: username || '',
      role: role || ''
    });
    
    // If we have a startupId, also update the startup data and send WebSocket notification
    if (startupId) {
      await saveWalletToStartup(startupId, walletAddress, username);
    } else if (role === 'founder') {
      // If the user is a founder, try to find associated startups
      try {
        // Try to find this user's startups
        const startupRef = ref(database, 'startups');
        const startupSnapshot = await get(startupRef);
        
        if (startupSnapshot.exists()) {
          const startups = startupSnapshot.val();
          
          // Look for startups with this founder ID
          for (const [id, data] of Object.entries(startups)) {
            const startup = data as any;
            if (
              (startup.founderId && startup.founderId.toString() === firebaseUid) ||
              (startup.founder_id && startup.founder_id.toString() === firebaseUid) ||
              (startup.createdBy && startup.createdBy.toString() === firebaseUid)
            ) {
              console.log(`[Wallet DB] Found associated startup ${id} for founder ${firebaseUid}`);
              
              // Update this startup with the wallet
              await saveWalletToStartup(id, walletAddress, username);
            }
          }
        }
      } catch (startupError) {
        console.error(`[Wallet DB] Error finding associated startups:`, startupError);
      }
    }
    
    console.log(`[Wallet DB] Successfully saved wallet to Firebase user ${firebaseUid}`);
    return true;
  } catch (error) {
    console.error(`[Wallet DB] Error saving wallet to Firebase user:`, error);
    return false;
  }
};

/**
 * Migrates a wallet address from numeric ID to Firebase UID
 */
export const migrateWalletToFirebaseUid = async (
  numericId: string | number,
  firebaseUid: string,
  walletAddress?: string
): Promise<boolean> => {
  try {
    console.log(`[Wallet DB] Migrating wallet from numeric ID ${numericId} to Firebase UID ${firebaseUid}`);
    
    // If wallet address is provided directly, use it instead of looking up
    if (walletAddress) {
      console.log(`[Wallet DB] Using provided wallet address: ${walletAddress}`);
      return await saveWalletAddress(firebaseUid, walletAddress);
    }
    
    // Get the wallet for the numeric ID
    const numId = typeof numericId === 'string' ? parseInt(numericId, 10) : numericId;
    const wallet = await getUserWallet(numId);
    
    if (!wallet) {
      console.log(`[Wallet DB] No wallet found for numeric ID ${numericId}`);
      return false;
    }
    
    // Save the wallet to the Firebase user
    const success = await saveWalletAddress(firebaseUid, wallet.address);
    
    return success;
  } catch (error) {
    console.error(`[Wallet DB] Error migrating wallet:`, error);
    return false;
  }
};

/**
 * Retrieves a founder's wallet address directly from the Firebase users collection
 * This function specifically targets the user record structure shown in the example:
 * {
 *   uid: "BMiH7YZcOUTW3CvLCiQzswOhsF32",
 *   walletAddress: "0x72f597d583ece34c3ab5244bbede639c846d1261",
 *   ...
 * }
 */
export const getFounderWalletAddress = async (founderId: string): Promise<string | null> => {
  try {
    console.log(`[Wallet DB] Getting founder wallet address for user ID: ${founderId}`);
    
    // Get the user record directly from Firebase
    const userRef = ref(database, `users/${founderId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      console.log(`[Wallet DB] Found user data:`, userData);
      
      // Check if walletAddress exists directly in the user object
      if (userData.walletAddress && userData.walletAddress.startsWith('0x')) {
        console.log(`[Wallet DB] Found wallet address in user data: ${userData.walletAddress}`);
        return userData.walletAddress;
      }
    }
    
    console.log(`[Wallet DB] No wallet address found for founder ID ${founderId}`);
    return null;
  } catch (error) {
    console.error('[Wallet DB] Error getting founder wallet address:', error);
    return null;
  }
};

/**
 * Gets a founder's wallet address using the sameId field that connects users and startups
 * This function first looks up the startup by its ID, then uses the sameId to find the
 * matching founder record, and finally returns the founder's wallet address.
 */
export const getFounderWalletBySameId = async (startupId: string): Promise<string | null> => {
  try {
    console.log(`[Wallet DB] Looking up founder wallet using sameId for startup: ${startupId}`);
    
    // Import database functions dynamically to avoid circular dependencies
    const { getStartupById, getUserByUid } = await import('@/firebase/database');
    
    // Step 1: Get the startup details
    const startup = await getStartupById(startupId);
    
    if (!startup) {
      console.log(`[Wallet DB] No startup found with ID: ${startupId}`);
      return null;
    }
    
    console.log(`[Wallet DB] Found startup:`, startup);
    
    // Step 2: Check if startup has a sameId
    if (!startup.sameId) {
      console.log(`[Wallet DB] Startup doesn't have a sameId`);
      
      // Fallback: try using founderId directly
      if (startup.founderId) {
        console.log(`[Wallet DB] Trying direct founderId lookup: ${startup.founderId}`);
        return getFounderWalletAddress(startup.founderId);
      }
      
      return null;
    }
    
    // Step 3: Look up users with the same sameId
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      console.log(`[Wallet DB] No users found in database`);
      return null;
    }
    
    // Step 4: Find user with matching sameId
    let founderUser: any = null;
    snapshot.forEach(childSnapshot => {
      const user = childSnapshot.val();
      if (user.sameId === startup.sameId) {
        console.log(`[Wallet DB] Found matching user with sameId:`, user);
        founderUser = user;
        // Return true to break out of the forEach loop
        return true;
      }
    });
    
    // Step 5: Return the wallet address if found
    if (founderUser && founderUser.walletAddress && founderUser.walletAddress.startsWith('0x')) {
      console.log(`[Wallet DB] Found founder wallet address through sameId: ${founderUser.walletAddress}`);
      return founderUser.walletAddress;
    }
    
    console.log(`[Wallet DB] Could not find founder wallet address using sameId`);
    return null;
  } catch (error) {
    console.error('[Wallet DB] Error getting founder wallet by sameId:', error);
    return null;
  }
};

/**
 * Deletes a wallet address from a user's account
 */
export const deleteWallet = async (
  firebaseUid: string | number
): Promise<boolean> => {
  try {
    const uid = firebaseUid.toString();
    console.log(`[Wallet DB] Deleting wallet for user ${uid}`);
    
    // Get the user data to check if they have a wallet
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      
      if (userData.walletAddress) {
        // Remove the wallet address reference
        await update(userRef, {
          walletAddress: null
        });
        
        console.log(`[Wallet DB] Successfully deleted wallet for user ${uid}`);
        return true;
      } else {
        console.log(`[Wallet DB] No wallet found for user ${uid}`);
        return false;
      }
    }
    
    // Try numeric ID format as fallback
    try {
      const numericId = typeof firebaseUid === 'string' ? parseInt(firebaseUid, 10) : firebaseUid;
      if (!isNaN(numericId)) {
        const wallet = await getUserWallet(numericId);
        if (wallet) {
          const walletRef = ref(database, `wallets/${wallet.address.toLowerCase()}`);
          await remove(walletRef);
          console.log(`[Wallet DB] Successfully removed wallet by numeric ID ${numericId}`);
          return true;
        }
      }
    } catch (e) {
      console.log(`[Wallet DB] Error trying numeric ID fallback:`, e);
    }
    
    return false;
  } catch (error) {
    console.error(`[Wallet DB] Error deleting wallet:`, error);
    return false;
  }
};