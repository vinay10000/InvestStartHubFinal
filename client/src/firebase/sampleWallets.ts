/**
 * MongoDB Wallet Service
 * 
 * This file provides real wallet address lookup from MongoDB
 * to replace the previous Firebase sample wallets.
 */

// Define response structure for MongoDB wallet data
interface MongoWalletResponse {
  address: string;
  userId: string | number;
  username?: string;
  isPermanent?: boolean;
  timestamp?: number;
}

// Function to fetch real wallets from MongoDB for investment purposes
export const addSampleWalletsToFirebase = async (): Promise<boolean> => {
  console.log("MongoDB Migration: Fetching real wallets from MongoDB");
  
  try {
    // Make an API call to MongoDB backend to confirm wallets are initialized
    const response = await fetch('/api/wallet/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error("Error initializing wallets in MongoDB:", await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("MongoDB wallet initialization error:", error);
    return false;
  }
};

// Function to check if real wallets exist in MongoDB
export const checkWalletsInFirebase = async (): Promise<boolean> => {
  console.log("MongoDB Migration: Checking real wallets in MongoDB");
  
  try {
    // Make an API call to MongoDB backend to check wallet status
    const response = await fetch('/api/wallet/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error("Error checking wallets in MongoDB:", await response.text());
      return false;
    }
    
    const data = await response.json();
    return data.walletsExist || false;
  } catch (error) {
    console.error("MongoDB wallet check error:", error);
    return false;
  }
};

// Function to fetch real startup wallet from MongoDB
export const ensureStartupHasWallet = async (startupId: string | number): Promise<string> => {
  if (!startupId) {
    console.error("MongoDB wallet lookup: No startup ID provided");
    return "";
  }
  
  console.log(`MongoDB Migration: Fetching real wallet for startup ${startupId}`);
  
  try {
    // Make an API call to MongoDB backend to get wallet for this startup
    const response = await fetch(`/api/wallet/startup/${startupId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Error getting wallet for startup ${startupId}:`, await response.text());
      return "";
    }
    
    const walletData = await response.json();
    
    if (walletData && walletData.address) {
      console.log(`Found MongoDB wallet for startup ${startupId}: ${walletData.address}`);
      return walletData.address;
    }
    
    console.log(`No wallet found for startup ${startupId} in MongoDB`);
    return "";
  } catch (error) {
    console.error(`MongoDB wallet lookup error for startup ${startupId}:`, error);
    return "";
  }
};