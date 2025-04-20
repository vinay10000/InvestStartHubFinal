import { getDatabase, ref, get } from 'firebase/database';
import { app } from './config';
import { getStartupById } from './database';

// Define extended types to handle additional wallet properties
interface ExtendedStartupData {
  id?: string;
  name?: string;
  description?: string;
  founderWalletAddress?: string | null;
  walletAddress?: string | null; 
  founderId?: string | number;
  founder_id?: string | number;
  founder?: {
    walletAddress?: string | null;
    [key: string]: any;
  };
  [key: string]: any;
}

// Initialize Firebase Realtime Database
const database = getDatabase(app);

/**
 * Directly fetch the wallet address for a startup from Firebase
 * This function prioritizes real wallet addresses and avoids sample wallets
 */
export const getStartupWallet = async (startupId: string | number): Promise<string | null> => {
  try {
    console.log(`[getStartupWallet] Fetching wallet for startup ID: ${startupId}`);
    
    // Convert the ID to a string for consistency
    const startupIdStr = startupId.toString();
    
    // APPROACH 1: Direct lookup in the startup data
    const startupRef = ref(database, `startups/${startupIdStr}`);
    const snapshot = await get(startupRef);
    
    if (snapshot.exists()) {
      const startupData = snapshot.val();
      console.log(`[getStartupWallet] Found startup data:`, startupData);
      
      // Check for wallet address in various fields (handle different naming conventions)
      if (startupData.founderWalletAddress) {
        console.log(`[getStartupWallet] Found founderWalletAddress:`, startupData.founderWalletAddress);
        return startupData.founderWalletAddress;
      }
      
      if (startupData.walletAddress) {
        console.log(`[getStartupWallet] Found walletAddress:`, startupData.walletAddress);
        return startupData.walletAddress;
      }
      
      // Check for founder ID to lookup the founder's wallet
      const founderId = startupData.founderId || startupData.founder_id;
      
      if (founderId) {
        console.log(`[getStartupWallet] Looking up founder's wallet with ID:`, founderId);
        
        // APPROACH 2: Look up the founder's user record
        const founderRef = ref(database, `users/${founderId}`);
        const founderSnapshot = await get(founderRef);
        
        if (founderSnapshot.exists()) {
          const founderData = founderSnapshot.val();
          console.log(`[getStartupWallet] Found founder data:`, founderData);
          
          if (founderData.walletAddress) {
            console.log(`[getStartupWallet] Found founder's walletAddress:`, founderData.walletAddress);
            return founderData.walletAddress;
          }
        }
      }
    }
    
    // APPROACH 3: Use the general database helper (fallback)
    console.log(`[getStartupWallet] Trying fallback with getStartupById`);
    const startup = await getStartupById(startupIdStr);
    
    if (startup) {
      console.log(`[getStartupWallet] Found startup via getStartupById:`, startup);
      
      // Check for wallet addresses in the returned startup object
      if (startup.founderWalletAddress) {
        console.log(`[getStartupWallet] Found founderWalletAddress via getStartupById:`, startup.founderWalletAddress);
        return startup.founderWalletAddress;
      }
      
      if (startup.walletAddress) {
        console.log(`[getStartupWallet] Found walletAddress via getStartupById:`, startup.walletAddress);
        return startup.walletAddress;
      }
      
      // If we have a founder object with wallet
      if (startup.founder && startup.founder.walletAddress) {
        console.log(`[getStartupWallet] Found founder's walletAddress via getStartupById:`, startup.founder.walletAddress);
        return startup.founder.walletAddress;
      }
    }
    
    console.log(`[getStartupWallet] No wallet found for startup ID: ${startupId}`);
    return null;
  } catch (error) {
    console.error(`[getStartupWallet] Error fetching wallet:`, error);
    return null;
  }
};

/**
 * Verifies if a wallet is a sample/fake wallet address (for testing purposes only)
 */
export const isSampleWalletAddress = (address: string | null | undefined): boolean => {
  if (!address) return false;
  
  // List of known sample/test wallet addresses
  const sampleWalletAddresses = [
    "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
    "0xdaa06d76757ea049fb47f424bb0b2fb8fc44679f",
    "0x59a5208b32e627891c389ebafc644145224006e8",
    "0x742d35cc6634c0532925a3b844bc454e4438f44e",
    "0x2b5ad5c4795c026514f8317c7a215e218dccd6cf",
    "0x6813eb9362372eef6200f3b1dbc3f819671cba69",
    "0x1eff47bc3a10a45d4b230b5d10e37751fe6aa718",
    "0x78731d3ca6b7e34ac0f824c42a7cc18a495cabab",
    "0x617f2e2fd72fd9d5503197092ac168c91465e7f2"
  ];
  
  // Normalize the address (lowercase)
  const normalizedAddress = address.toLowerCase();
  
  return sampleWalletAddresses.includes(normalizedAddress);
};