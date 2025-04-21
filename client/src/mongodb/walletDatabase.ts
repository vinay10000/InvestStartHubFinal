/**
 * MongoDB Wallet Database
 * 
 * This module replaces the Firebase wallet database with MongoDB functionality.
 * It manages wallet addresses for users in the MongoDB database.
 */

/**
 * Save a wallet address for a user
 */
export async function saveWalletAddress(
  userId: string,
  walletAddress: string,
  username: string = '',
  role: string = 'investor'
): Promise<void> {
  try {
    // Call the server API to save the wallet address
    const response = await fetch('/api/user/wallet/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        walletAddress,
        username,
        role
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Error saving wallet address: ${response.statusText}`);
    }

    console.log('Wallet address saved to MongoDB:', walletAddress);
  } catch (error) {
    console.error('Error saving wallet address to MongoDB:', error);
    throw error;
  }
}

/**
 * Check if a wallet address is already in use
 */
export async function isWalletAddressInUse(walletAddress: string): Promise<boolean> {
  try {
    // Call the server API to check if the wallet address is in use
    const response = await fetch(`/api/wallets/address/${walletAddress}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Error checking wallet address: ${response.statusText}`);
    }

    const data = await response.json();
    // If userId exists, the wallet is in use
    return !!data.userId;
  } catch (error) {
    console.error('Error checking wallet address in MongoDB:', error);
    // Default to false if there's an error
    return false;
  }
}

/**
 * Get the wallet address for a user
 */
export async function getWalletAddressByUserId(userId: string): Promise<string | null> {
  try {
    // Call the server API to get the wallet address
    const response = await fetch(`/api/wallets/user/${userId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Error fetching wallet address: ${response.statusText}`);
    }

    const data = await response.json();
    return data.walletAddress || null;
  } catch (error) {
    console.error('Error fetching wallet address from MongoDB:', error);
    return null;
  }
}

/**
 * Remove a wallet address for a user
 */
export async function removeWalletAddress(userId: string): Promise<void> {
  try {
    // Call the server API to remove the wallet address
    const response = await fetch('/api/user/wallet/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Error removing wallet address: ${response.statusText}`);
    }

    console.log('Wallet address removed from MongoDB for user:', userId);
  } catch (error) {
    console.error('Error removing wallet address from MongoDB:', error);
    throw error;
  }
}

/**
 * Delete wallet - alias for removeWalletAddress for compatibility
 */
export async function deleteWallet(userId: string): Promise<void> {
  return removeWalletAddress(userId);
}

/**
 * Mark a wallet address as permanent for a user
 */
export async function markWalletAsPermanent(userId: string): Promise<void> {
  try {
    // Call the server API to mark the wallet as permanent
    const response = await fetch('/api/user/wallet/permanent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Error marking wallet as permanent: ${response.statusText}`);
    }

    console.log('Wallet marked as permanent in MongoDB for user:', userId);
  } catch (error) {
    console.error('Error marking wallet as permanent in MongoDB:', error);
    throw error;
  }
}

/**
 * Migrate wallet data from a numeric ID to a MongoDB UID
 */
export async function migrateWalletToMongoUid(
  numericId: string,
  mongoUid: string,
  walletAddress: string
): Promise<void> {
  try {
    // This is a client-side implementation - on the server, we'd associate
    // the same wallet address with the MongoDB UID to ensure both IDs
    // reference the same wallet.
    console.log(`Migrating wallet ${walletAddress} from ID ${numericId} to MongoDB UID ${mongoUid}`);

    // Simply store the wallet under the MongoDB UID
    await saveWalletAddress(mongoUid, walletAddress);
  } catch (error) {
    console.error('Error migrating wallet to MongoDB UID:', error);
    throw error;
  }
}