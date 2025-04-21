/**
 * MongoDB Startup Wallet Functions
 * 
 * This module replaces the Firebase startup wallet functions with MongoDB functionality.
 * It retrieves wallet addresses for startups from the MongoDB database.
 */

/**
 * Get the wallet address for a startup
 */
export async function getStartupWalletAddress(startupId: string | number): Promise<string | null> {
  try {
    // Call the server API to get the wallet address for the startup
    const response = await fetch(`/api/wallets/startup/${startupId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Error fetching startup wallet address: ${response.statusText}`);
    }

    const data = await response.json();
    return data.walletAddress || null;
  } catch (error) {
    console.error('Error fetching startup wallet address from MongoDB:', error);
    return null;
  }
}

/**
 * Store a wallet address for a startup
 */
export async function setStartupWalletAddress(
  startupId: string | number, 
  walletAddress: string
): Promise<void> {
  try {
    // Get the startup first to confirm it exists
    const startupResponse = await fetch(`/api/startups/${startupId}`, {
      credentials: 'include'
    });

    if (!startupResponse.ok) {
      throw new Error(`Error fetching startup: ${startupResponse.statusText}`);
    }

    const startup = await startupResponse.json();
    
    if (!startup) {
      throw new Error(`Startup with ID ${startupId} not found`);
    }

    // Update the startup with the wallet address
    const response = await fetch(`/api/startups/${startupId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Error setting startup wallet address: ${response.statusText}`);
    }

    console.log('Wallet address set for startup in MongoDB:', walletAddress);
  } catch (error) {
    console.error('Error setting startup wallet address in MongoDB:', error);
    throw error;
  }
}