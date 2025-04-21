// Import our local mock implementations instead of Firebase SDK
import { getDatabase, ref, get } from './firebase';
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

// Initialize Firebase Realtime Database with our mock
const database = getDatabase();

/**
 * Directly fetch the wallet address for a startup from Firebase
 * This function prioritizes real wallet addresses and avoids sample wallets
 * Getting the address directly from the user who created the startup
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
      
      // First check if the startup itself has the wallet address
      if (startupData.founderWalletAddress && !isSampleWalletAddress(startupData.founderWalletAddress)) {
        console.log(`[getStartupWallet] Found valid founderWalletAddress:`, startupData.founderWalletAddress);
        return startupData.founderWalletAddress;
      }
      
      if (startupData.walletAddress && !isSampleWalletAddress(startupData.walletAddress)) {
        console.log(`[getStartupWallet] Found valid walletAddress:`, startupData.walletAddress);
        return startupData.walletAddress;
      }
      
      // Check for the user ID who created this startup
      const userId = startupData.userId || startupData.createdBy || startupData.uid;
      
      // If we have the userId field, prioritize that over founderId
      if (userId) {
        console.log(`[getStartupWallet] Looking up creator's wallet with user ID:`, userId);
        
        // Look up the user's record by userId (creator)
        const userRef = ref(database, `users/${userId}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          console.log(`[getStartupWallet] Found creator data:`, userData);
          
          if (userData.walletAddress && !isSampleWalletAddress(userData.walletAddress)) {
            console.log(`[getStartupWallet] Found creator's walletAddress:`, userData.walletAddress);
            return userData.walletAddress;
          }
        }
      }
      
      // Check for founder ID as fallback
      const founderId = startupData.founderId || startupData.founder_id;
      
      if (founderId) {
        console.log(`[getStartupWallet] Looking up founder's wallet with ID:`, founderId);
        
        // APPROACH 2: Look up the founder's user record
        const founderRef = ref(database, `users/${founderId}`);
        const founderSnapshot = await get(founderRef);
        
        if (founderSnapshot.exists()) {
          const founderData = founderSnapshot.val();
          console.log(`[getStartupWallet] Found founder data:`, founderData);
          
          if (founderData.walletAddress && !isSampleWalletAddress(founderData.walletAddress)) {
            console.log(`[getStartupWallet] Found founder's walletAddress:`, founderData.walletAddress);
            return founderData.walletAddress;
          }
        }
      }
    }
    
    // APPROACH 3: Look for all users with 'founder' role and match by startup name
    console.log(`[getStartupWallet] Searching for founders by role and startup name`);
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (usersSnapshot.exists() && snapshot.exists()) {
      const startupData = snapshot.val();
      const startupName = startupData.name?.toLowerCase();
      
      if (startupName) {
        const users = usersSnapshot.val();
        
        for (const [userId, userData] of Object.entries(users)) {
          const user = userData as any;
          
          // Check if this is a founder with a wallet address and possibly related to our startup
          if (
            user.role === 'founder' && 
            user.walletAddress && 
            !isSampleWalletAddress(user.walletAddress) &&
            (
              // Extra check: if this founder has created startups with similar names
              (user.startups && Object.values(user.startups).some((s: any) => 
                s.name?.toLowerCase().includes(startupName) || startupName.includes(s.name?.toLowerCase())
              )) ||
              // Or their username/email contains part of the startup name
              (user.username && user.username.toLowerCase().includes(startupName.split(' ')[0].toLowerCase())) ||
              (user.email && user.email.toLowerCase().includes(startupName.split(' ')[0].toLowerCase()))
            )
          ) {
            console.log(`[getStartupWallet] Found potential founder match:`, user.username, user.walletAddress);
            return user.walletAddress;
          }
        }
      }
    }
    
    // APPROACH 4: Use the general database helper (fallback)
    console.log(`[getStartupWallet] Trying fallback with getStartupById`);
    const startup = await getStartupById(startupIdStr);
    
    if (startup) {
      console.log(`[getStartupWallet] Found startup via getStartupById:`, startup);
      
      // Check for wallet addresses in the returned startup object
      if (startup.founderWalletAddress && !isSampleWalletAddress(startup.founderWalletAddress)) {
        console.log(`[getStartupWallet] Found founderWalletAddress via getStartupById:`, startup.founderWalletAddress);
        return startup.founderWalletAddress;
      }
      
      if (startup.walletAddress && !isSampleWalletAddress(startup.walletAddress)) {
        console.log(`[getStartupWallet] Found walletAddress via getStartupById:`, startup.walletAddress);
        return startup.walletAddress;
      }
      
      // If we have a founder object with wallet
      if (startup.founder && startup.founder.walletAddress && !isSampleWalletAddress(startup.founder.walletAddress)) {
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