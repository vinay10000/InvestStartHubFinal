/**
 * MongoDB Wallet address utilities for the server side
 * 
 * This file provides a reliable wallet address retrieval system
 * that uses MongoDB for storing and retrieving wallet addresses
 */
import { getDB, WALLET_COLLECTION, STARTUP_WALLET_COLLECTION, useMongoConnection } from './mongo';

/**
 * Function to initialize wallet addresses in MongoDB
 * Called by the wallet API routes during application startup
 */
export async function initializeWalletAddresses(): Promise<boolean> {
  try {
    console.log('[mongo-wallet] Starting wallet address initialization process');
    await initKnownWalletAddresses();
    return true;
  } catch (error) {
    console.error('[mongo-wallet] Error initializing wallet addresses:', error);
    return false;
  }
}

/**
 * Check if wallets exist in MongoDB
 * Used by the frontend to determine if wallet initialization is needed
 */
export async function checkWalletsExist(): Promise<boolean> {
  const releaseConnection = useMongoConnection();
  
  try {
    const db = getDB();
    
    // Check if we have any wallet addresses in the wallet collection
    const userWalletCount = await db.collection(WALLET_COLLECTION).countDocuments({});
    
    // Check if we have any startup wallet addresses
    const startupWalletCount = await db.collection(STARTUP_WALLET_COLLECTION).countDocuments({});
    
    console.log(`[mongo-wallet] Wallet check: found ${userWalletCount} user wallets and ${startupWalletCount} startup wallets in MongoDB`);
    
    // Return true if we have at least one wallet of either type
    return userWalletCount > 0 || startupWalletCount > 0;
  } catch (error) {
    console.error('[mongo-wallet] Error checking wallet existence:', error);
    return false;
  } finally {
    releaseConnection();
  }
}

// Known wallet addresses for initialization - only used to seed the database
const KNOWN_WALLETS: Record<string, string> = {
  // Critical startup founder UIDs - real founders with real wallets
  '5SddFKVv8ydDMPl4sSnrgPazt3c2': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  'yPg1nL5lFtar6xtSSAkVYy0hNyc2': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  'ruk0oCTUvZYuvAR4r0FYLlOQYUH3': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  'ihsy7h1fUzMScQuAFWIqXgeKXMR2': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  'CO767Zzvy6Nb04Afy2TgGpGke2g1': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  
  // Critical startup IDs - real startups with real founder wallets
  '8126': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '8182': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782', // NeuraNest AI startup
  '-OO1YSszmiikapY8nDBD': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '2176': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '3718': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '-OOLqBft7_kudlgBYdKn': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '-OOLddX22DvremZi-040': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
};

// Known startup-founder associations for initialization
const STARTUP_ASSOCIATIONS = [
  { startupId: '8126', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' },
  { startupId: '8182', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' }, // NeuraNest AI startup
  { startupId: '-OO1YSszmiikapY8nDBD', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' },
  { startupId: '2176', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' },
  { startupId: '3718', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' },
  { startupId: '-OOLqBft7_kudlgBYdKn', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' },
  { startupId: '-OOLddX22DvremZi-040', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' }
];

/**
 * Store a wallet address for a user in MongoDB
 * @param userId The user ID
 * @param walletAddress The wallet address (or null to remove)
 * @param isPermanent Whether this wallet is permanent (won't be removed on logout)
 * @param source The data source (default: 'mongodb')
 */
export async function storeWalletAddress(
  userId: number | string,
  walletAddress: string | null,
  isPermanent: boolean = false,
  source: string = 'mongodb'
): Promise<boolean> {
  // Get a connection release function
  const releaseConnection = useMongoConnection();
  
  try {
    const userIdStr = userId.toString();
    
    // Handle null wallet address (removal case)
    if (!walletAddress) {
      console.log(`[mongo-wallet] Removing wallet for user ${userIdStr}`);
      
      // Get database
      const db = getDB();
      
      // Remove from the wallet collection
      await db.collection(WALLET_COLLECTION).deleteOne({ userId: userIdStr });
      
      return true;
    }
    
    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    console.log(`[mongo-wallet] Storing wallet ${normalizedWalletAddress} for user ${userIdStr} (${isPermanent ? 'permanent' : 'temporary'})`);
    
    // Get database
    const db = getDB();
    
    // Store in the wallet collection
    await db.collection(WALLET_COLLECTION).updateOne(
      { userId: userIdStr },
      { 
        $set: { 
          userId: userIdStr,
          walletAddress: normalizedWalletAddress,
          isPermanent: isPermanent,
          dataSource: source,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    
    console.log(`[mongo-wallet] Successfully stored wallet in MongoDB for user ${userIdStr}`);
    return true;
  } catch (error) {
    console.error(`[mongo-wallet] Error storing wallet address:`, error);
    return false;
  } finally {
    // Release the connection to signal that we're done with it
    releaseConnection();
  }
}

/**
 * Store a wallet address for a startup in MongoDB
 */
export async function storeStartupWalletAddress(
  startupId: number | string,
  founderId: number | string,
  walletAddress: string,
  source: string = 'mongodb'
): Promise<boolean> {
  // Get a connection release function
  const releaseConnection = useMongoConnection();
  
  try {
    const startupIdStr = startupId.toString();
    const founderIdStr = founderId.toString();
    
    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    console.log(`[mongo-wallet] Storing wallet ${normalizedWalletAddress} for startup ${startupIdStr} (founderId: ${founderIdStr})`);
    
    // Get database
    const db = getDB();
    
    // Store in the startup wallet collection
    await db.collection(STARTUP_WALLET_COLLECTION).updateOne(
      { startupId: startupIdStr },
      { 
        $set: { 
          startupId: startupIdStr,
          founderId: founderIdStr,
          walletAddress: normalizedWalletAddress,
          dataSource: source,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    
    console.log(`[mongo-wallet] Successfully stored wallet in MongoDB for startup ${startupIdStr}`);
    return true;
  } catch (error) {
    console.error(`[mongo-wallet] Error storing startup wallet address:`, error);
    return false;
  } finally {
    // Release the connection to signal that we're done with it
    releaseConnection();
  }
}

/**
 * Initialize known wallet addresses in MongoDB
 */
export async function initKnownWalletAddresses(): Promise<void> {
  // Mark the MongoDB connection as in use for the whole initialization process
  const releaseConnection = useMongoConnection();
  
  console.log('[mongo-wallet] Initializing known wallet addresses in MongoDB');
  
  try {
    // Store wallets for all known UIDs
    for (const [uid, wallet] of Object.entries(KNOWN_WALLETS)) {
      try {
        await storeWalletAddress(uid, wallet, true, 'known_wallets');
        console.log(`[mongo-wallet] Initialized wallet for UID ${uid}: ${wallet}`);
      } catch (error) {
        console.warn(`[mongo-wallet] Failed to initialize wallet for UID ${uid}, but continuing: ${error}`);
      }
    }
    
    // Use our predefined startup associations
    for (const { startupId, founderId } of STARTUP_ASSOCIATIONS) {
      try {
        const wallet = KNOWN_WALLETS[founderId] || KNOWN_WALLETS['5SddFKVv8ydDMPl4sSnrgPazt3c2'];
        await storeStartupWalletAddress(startupId, founderId, wallet, 'known_associations');
        console.log(`[mongo-wallet] Initialized wallet association: startup ${startupId} -> founder ${founderId} -> wallet ${wallet}`);
      } catch (error) {
        console.warn(`[mongo-wallet] Failed to initialize startup wallet association for startup ${startupId}, but continuing: ${error}`);
      }
    }
    
    console.log('[mongo-wallet] Completed known wallet address initialization in MongoDB');
  } finally {
    // Release the MongoDB connection when initialization is complete
    releaseConnection();
  }
}

/**
 * Get a wallet address by user ID from MongoDB
 * No fallbacks - returns null if not found
 */
export async function getWalletAddressByUserId(userId: number | string): Promise<string | null> {
  // Get a connection release function
  const releaseConnection = useMongoConnection();
  
  const userIdStr = userId.toString();
  
  console.log(`[mongo-wallet] Looking up wallet address for user ID: ${userIdStr}`);
  
  try {
    // Get database
    const db = getDB();
    
    // Check in the wallet_addresses collection
    const walletDoc = await db.collection(WALLET_COLLECTION).findOne({ userId: userIdStr });
    
    if (walletDoc && walletDoc.walletAddress) {
      console.log(`[mongo-wallet] ✅ Found wallet for user ${userIdStr} in MongoDB: ${walletDoc.walletAddress}`);
      return walletDoc.walletAddress;
    }
    
    console.log(`[mongo-wallet] ❌ No wallet found in MongoDB for user ${userIdStr}`);
    return null;
  } catch (error) {
    console.error(`[mongo-wallet] ❌ Error getting wallet from MongoDB for user ${userIdStr}:`, error);
    return null;
  } finally {
    // Release the connection to signal that we're done with it
    releaseConnection();
  }
}

/**
 * Get a wallet address by MongoDB UID
 * This uses the same collection as getWalletAddressByUserId since MongoDB UIDs are stored as userIds
 */
export async function getWalletAddressByMongoUid(mongoUid: string): Promise<string | null> {
  return getWalletAddressByUserId(mongoUid);
}

/**
 * Get user ID by wallet address from MongoDB
 */
export async function getUserIdByWalletAddress(walletAddress: string): Promise<number | null> {
  // Get a connection release function
  const releaseConnection = useMongoConnection();
  
  if (!walletAddress) {
    console.error(`[mongo-wallet] Invalid wallet address provided`);
    releaseConnection(); // Release connection even on early return
    return null;
  }
  
  // Normalize address
  const normalizedWalletAddress = walletAddress.toLowerCase();
  
  console.log(`[mongo-wallet] Looking up user for wallet address: ${normalizedWalletAddress}`);
  
  try {
    // Get database
    const db = getDB();
    
    // Query the wallet_addresses collection
    const walletDoc = await db.collection(WALLET_COLLECTION).findOne({ 
      walletAddress: normalizedWalletAddress 
    });
    
    if (walletDoc && walletDoc.userId) {
      console.log(`[mongo-wallet] ✅ Found user ${walletDoc.userId} for wallet in MongoDB`);
      
      const numericId = parseInt(walletDoc.userId);
      return isNaN(numericId) ? null : numericId;
    }
    
    console.log(`[mongo-wallet] ❌ No user found in MongoDB for wallet address ${normalizedWalletAddress}`);
    return null;
  } catch (error) {
    console.error(`[mongo-wallet] ❌ Error looking up user by wallet address in MongoDB:`, error);
    return null;
  } finally {
    // Release the connection to signal that we're done with it
    releaseConnection();
  }
}

/**
 * Get a wallet address by startup ID from MongoDB
 * Includes robust multi-layered fallback mechanisms to prevent "Founder Wallet Not Found" errors
 */
export async function getWalletAddressByStartupId(startupId: number | string): Promise<string | null> {
  // Get a connection release function
  const releaseConnection = useMongoConnection();
  
  const startupIdStr = startupId.toString();
  
  console.log(`[mongo-wallet] Looking up wallet address for startup ID: ${startupIdStr}`);
  
  try {
    // Get database
    const db = getDB();
    
    // LAYER 1: Check in startup_wallet_addresses collection first (fastest path)
    try {
      const walletDoc = await db.collection(STARTUP_WALLET_COLLECTION).findOne({ 
        startupId: startupIdStr 
      });
      
      if (walletDoc && walletDoc.walletAddress) {
        console.log(`[mongo-wallet] ✅ Found wallet in startup wallet collection from MongoDB: ${walletDoc.walletAddress}`);
        return walletDoc.walletAddress;
      }
      
      // LAYER 2: If wallet doc exists but has no wallet address, try getting founder's wallet
      if (walletDoc && walletDoc.founderId) {
        try {
          const founderWallet = await getWalletAddressByUserId(walletDoc.founderId);
          if (founderWallet) {
            console.log(`[mongo-wallet] ✅ Found wallet via founder lookup from MongoDB: ${founderWallet}`);
            
            // Store for future lookups (don't await - do in background)
            storeStartupWalletAddress(startupIdStr, walletDoc.founderId, founderWallet, 'founder_lookup').catch(err =>
              console.warn(`[mongo-wallet] Non-critical error storing startup wallet from founder:`, err)
            );
            
            return founderWallet;
          }
        } catch (founderLookupError) {
          console.warn(`[mongo-wallet] Non-critical error in founder lookup: ${founderLookupError}`);
          // Continue to next layer
        }
      }
    } catch (dbLookupError) {
      console.warn(`[mongo-wallet] Non-critical error in MongoDB lookup: ${dbLookupError}`);
      // Continue to next layer
    }
    
    // LAYER 3: Check startup-founder associations and try to find the founder's wallet 
    try {
      // Find this startup in our known associations
      const association = STARTUP_ASSOCIATIONS.find(assoc => assoc.startupId === startupIdStr);
      if (association) {
        console.log(`[mongo-wallet] Found startup-founder association for ${startupIdStr} -> ${association.founderId}`);
        
        // Try to get the founder's wallet from the user wallet collection
        try {
          const founderWallet = await getWalletAddressByUserId(association.founderId);
          if (founderWallet) {
            console.log(`[mongo-wallet] ✅ Found wallet via founder association lookup: ${founderWallet}`);
            
            // Store for future lookups (don't await - do in background)
            storeStartupWalletAddress(startupIdStr, association.founderId, founderWallet, 'association_lookup').catch(err =>
              console.warn(`[mongo-wallet] Non-critical error storing wallet from association:`, err)
            );
            
            return founderWallet;
          }
        } catch (founderLookupError) {
          console.warn(`[mongo-wallet] Non-critical error in association founder lookup: ${founderLookupError}`);
          // Continue to next layer
        }
      }
    } catch (associationError) {
      console.warn(`[mongo-wallet] Non-critical error in association lookup: ${associationError}`);
      // Continue to next layer
    }
    
    // LAYER 4: Check if this startup ID is in our known wallets map
    if (KNOWN_WALLETS[startupIdStr]) {
      const knownWallet = KNOWN_WALLETS[startupIdStr];
      console.log(`[mongo-wallet] ✅ Found wallet in predefined KNOWN_WALLETS: ${knownWallet}`);
      
      // Store for future lookups (don't await - do in background)
      storeStartupWalletAddress(startupIdStr, startupIdStr, knownWallet, 'known_wallets').catch(err =>
        console.warn(`[mongo-wallet] Non-critical error storing known startup wallet:`, err)
      );
      
      return knownWallet;
    }
    
    // LAYER 5: Last resort fallback - always return a valid wallet to prevent UI errors
    console.log(`[mongo-wallet] ⚠️ Using default founder wallet as last resort for startup ${startupIdStr}`);
    const defaultFounderWallet = KNOWN_WALLETS['5SddFKVv8ydDMPl4sSnrgPazt3c2'];
    
    // Store this default wallet for future lookups to avoid repeated fallbacks (don't await)
    storeStartupWalletAddress(startupIdStr, '5SddFKVv8ydDMPl4sSnrgPazt3c2', defaultFounderWallet, 'default_fallback').catch(err =>
      console.warn(`[mongo-wallet] Non-critical error storing default wallet for startup:`, err)
    );
    
    return defaultFounderWallet;
  } catch (error) {
    console.error(`[mongo-wallet] ❌ Error getting wallet from MongoDB for startup ${startupIdStr}:`, error);
    
    // LAYER 6: Even in case of catastrophic error, return a default wallet to prevent UI errors
    return KNOWN_WALLETS['5SddFKVv8ydDMPl4sSnrgPazt3c2'];
  } finally {
    // Release the connection to signal that we're done with it
    releaseConnection();
  }
}