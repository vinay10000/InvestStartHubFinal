/**
 * MongoDB-compatible wallet database functions
 * 
 * This module handles saving, retrieving, and managing wallet addresses 
 * through the MongoDB API instead of Firebase.
 */

/**
 * Migrate a wallet from a numeric user ID to a Firebase UID
 * This is used during the transition from MongoDB to Firebase
 * 
 * @param numericId The numeric ID of the user in the database
 * @param firebaseUid The Firebase UID to associate with the wallet
 * @param walletAddress The wallet address to migrate
 * @returns A promise that resolves when the operation is complete
 */
export async function migrateWalletToFirebaseUid(
  numericId: number,
  firebaseUid: string,
  walletAddress: string
): Promise<void> {
  try {
    // Make an API call to migrate the wallet
    const response = await fetch('/api/user/wallet/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        numericId,
        firebaseUid,
        walletAddress
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to migrate wallet address');
    }
    
    console.log(`Wallet address ${walletAddress} migrated from user ${numericId} to Firebase UID ${firebaseUid}`);
  } catch (error) {
    console.error('Error migrating wallet address:', error);
    throw error;
  }
}

/**
 * Delete a wallet address completely
 * 
 * @param walletAddress The wallet address to remove from all associations
 * @returns A promise that resolves when the operation is complete
 */
export async function deleteWallet(walletAddress: string): Promise<void> {
  try {
    // Make an API call to delete the wallet
    const response = await fetch(`/api/wallet/delete/${walletAddress}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to delete wallet address');
    }
    
    console.log(`Wallet address ${walletAddress} completely removed from the system`);
  } catch (error) {
    console.error('Error deleting wallet address:', error);
    throw error;
  }
}

/**
 * Save a wallet address to the MongoDB database
 * 
 * @param userId The ID of the user to associate with this wallet address
 * @param walletAddress The Ethereum wallet address to save
 * @param displayName The user's display name
 * @param role The user's role (founder or investor)
 * @param isPermanent Whether this is a permanent wallet association
 * @returns A promise that resolves when the operation is complete
 */
export async function saveWalletAddress(
  userId: string,
  walletAddress: string,
  displayName: string = 'User',
  role: string = 'investor',
  isPermanent: boolean = true
): Promise<void> {
  try {
    // Make an API call to save the wallet address
    const response = await fetch('/api/wallet/associate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        walletAddress,
        displayName,
        role,
        isPermanent
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to save wallet address');
    }
    
    console.log(`Wallet address ${walletAddress} saved for user ${userId}`);
  } catch (error) {
    console.error('Error saving wallet address:', error);
    throw error;
  }
}

/**
 * Get a wallet address for a user from MongoDB
 * 
 * @param userId The ID of the user
 * @returns A promise that resolves to the wallet address or null if not found
 */
export async function getWalletAddress(userId: string): Promise<string | null> {
  try {
    // Make an API call to get the wallet address
    const response = await fetch(`/api/wallet/user/${userId}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No wallet address found
      }
      throw new Error('Failed to get wallet address');
    }
    
    const data = await response.json();
    return data.walletAddress;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
}

/**
 * Find a user ID by wallet address
 * 
 * @param walletAddress The Ethereum wallet address
 * @returns A promise that resolves to the user ID or null if not found
 */
export async function getUserIdByWalletAddress(walletAddress: string): Promise<string | null> {
  try {
    // Make an API call to find the user ID
    const response = await fetch(`/api/wallet/address/${walletAddress}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No user found with this wallet address
      }
      throw new Error('Failed to get user by wallet address');
    }
    
    const data = await response.json();
    return data.userId;
  } catch (error) {
    console.error('Error getting user by wallet address:', error);
    return null;
  }
}

/**
 * Remove a wallet address association
 * 
 * @param userId The ID of the user
 * @returns A promise that resolves when the operation is complete
 */
export async function removeWalletAddress(userId: string): Promise<void> {
  try {
    // Make an API call to remove the wallet address
    const response = await fetch(`/api/wallet/user/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to remove wallet address');
    }
    
    console.log(`Wallet address removed for user ${userId}`);
  } catch (error) {
    console.error('Error removing wallet address:', error);
    throw error;
  }
}

/**
 * Check if wallets database is initialized
 * 
 * @returns A promise that resolves to a boolean indicating if the wallets DB is initialized
 */
export async function checkWalletsInitialized(): Promise<boolean> {
  try {
    // Make an API call to check if wallets are initialized
    const response = await fetch('/api/wallet/status', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.initialized;
  } catch (error) {
    console.error('Error checking wallets initialization status:', error);
    return false;
  }
}

/**
 * Initialize wallet addresses if not already initialized
 * 
 * @returns A promise that resolves when the operation is complete
 */
export async function initializeWalletAddresses(): Promise<void> {
  try {
    // Check if already initialized
    const initialized = await checkWalletsInitialized();
    if (initialized) {
      console.log('Wallet addresses already initialized');
      return;
    }
    
    // Make an API call to initialize wallet addresses
    const response = await fetch('/api/wallet/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to initialize wallet addresses');
    }
    
    console.log('Wallet addresses initialized successfully');
  } catch (error) {
    console.error('Error initializing wallet addresses:', error);
    throw error;
  }
}