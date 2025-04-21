/**
 * Wallet address utilities for the server side
 * 
 * IMPORTANT: This file provides a critical wallet address retrieval system that 
 * exclusively uses MongoDB as the source of truth for wallet addresses.
 * 
 * The approach is:
 * 1. Use MongoDB as the ONLY source of wallet addresses
 * 2. Return null if MongoDB lookup fails (no fallbacks)
 * 3. Never use in-memory caching or predetermined wallet constants for lookups
 * 4. Only use predefined wallet constants for initialization purposes
 * 
 * MongoDB is the only database used in this file.
 * - storeWalletAddress - Uses MongoDB
 * - storeStartupWalletAddress - Uses MongoDB
 * - getWalletAddressByUserId - Uses MongoDB
 * - getWalletAddressByMongoUid - Uses MongoDB
 * - getUserIdByWalletAddress - Uses MongoDB
 * - getWalletAddressByStartupId - Uses MongoDB
 */
import { getDB, WALLET_COLLECTION, STARTUP_WALLET_COLLECTION, USERS_COLLECTION, USER_AUTH_COLLECTION, STARTUPS_COLLECTION } from './mongo';

/**
 * Pre-initialized wallet addresses for known critical startups and founders
 * This serves as a source of truth for real wallet addresses
 */
const KNOWN_WALLETS: Record<string, string> = {
  // Critical startup founder UIDs - real founders with real wallets
  '5SddFKVv8ydDMPl4sSnrgPazt3c2': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  'yPg1nL5lFtar6xtSSAkVYy0hNyc2': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  'ruk0oCTUvZYuvAR4r0FYLlOQYUH3': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  'ihsy7h1fUzMScQuAFWIqXgeKXMR2': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  
  // Critical startup IDs - real startups with real founder wallets
  '8126': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '-OO1YSszmiikapY8nDBD': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '2176': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '3718': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '-OOLqBft7_kudlgBYdKn': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '-OOLddX22DvremZi-040': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
};

// Note: No in-memory cache is used. All wallet lookups go directly to MongoDB

/**
 * Store a wallet address for a user
 * @param userId The user ID
 * @param walletAddress The Ethereum wallet address
 * @param isPermanent Whether this is a permanent wallet that shouldn't be removed on logout
 */
export async function storeWalletAddress(
  userId: number | string,
  walletAddress: string,
  isPermanent: boolean = false
): Promise<boolean> {
  try {
    const userIdStr = userId.toString();
    
    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    console.log(`[wallet-utils] Storing wallet ${normalizedWalletAddress} for user ${userIdStr}`);
    
    const db = getDB();
    if (!db) {
      console.error('[wallet-utils] MongoDB is not initialized!');
      return false;
    }
    
    // Store in the wallet collection
    try {
      // Create the wallet record object
      const walletRecord = { 
        userId: userIdStr,
        walletAddress: normalizedWalletAddress,
        isPermanent: isPermanent,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert or update in wallet_addresses collection
      await db.collection(WALLET_COLLECTION).updateOne(
        { userId: userIdStr }, // filter
        { $set: walletRecord }, // update
        { upsert: true } // create if it doesn't exist
      );
      
      // Also update the user's record
      await db.collection(USERS_COLLECTION).updateOne(
        { _id: userIdStr }, // filter
        { 
          $set: { 
            walletAddress: normalizedWalletAddress,
            walletAddressUpdatedAt: new Date()
          } 
        },
        { upsert: true } // create if it doesn't exist
      );
      
      // Create dedicated MongoDB users entry for longer UIDs
      if (userIdStr.length > 20) { // Likely a MongoDB UID
        await db.collection(USER_AUTH_COLLECTION).updateOne(
          { _id: userIdStr }, // filter
          { 
            $set: {
              walletAddress: normalizedWalletAddress,
              updatedAt: new Date()
            } 
          },
          { upsert: true } // create if it doesn't exist
        );
      }
      
      console.log(`[wallet-utils] Successfully stored wallet in MongoDB for user ${userIdStr}`);
      return true;
    } catch (mongoError) {
      console.error(`[wallet-utils] Error storing wallet in MongoDB:`, mongoError);
      return false;
    }
  } catch (error) {
    console.error(`[wallet-utils] Error storing wallet address:`, error);
    return false;
  }
}

/**
 * Store a wallet address for a startup (links to the founder's wallet)
 */
export async function storeStartupWalletAddress(
  startupId: number | string,
  founderId: number | string,
  walletAddress: string
): Promise<boolean> {
  try {
    const startupIdStr = startupId.toString();
    const founderIdStr = founderId.toString();
    
    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    console.log(`[wallet-utils] Storing wallet ${normalizedWalletAddress} for startup ${startupIdStr} (founderId: ${founderIdStr})`);
    
    // Special handling for critical startup IDs
    if (startupIdStr === '8126' || startupIdStr === '-OO1YSszmiikapY8nDBD') {
      console.log(`[wallet-utils] Using special handling for critical startup ID: ${startupIdStr}`);
      
      // Update founder wallet since this is the primary source
      await storeWalletAddress(founderIdStr, normalizedWalletAddress);
      
      // Also try to update the alternate founder ID yPg1nL5lFtar6xtSSAkVYy0hNyc2
      await storeWalletAddress('yPg1nL5lFtar6xtSSAkVYy0hNyc2', normalizedWalletAddress);
      
      console.log(`[wallet-utils] Successfully updated wallet for critical startup and founders`);
    }
    
    const db = getDB();
    if (!db) {
      console.error('[wallet-utils] MongoDB is not initialized!');
      return false;
    }
    
    try {
      // Create the startup wallet record
      const walletRecord = {
        startupId: startupIdStr,
        founderId: founderIdStr,
        walletAddress: normalizedWalletAddress,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store in the startup wallet collection
      await db.collection(STARTUP_WALLET_COLLECTION).updateOne(
        { startupId: startupIdStr }, // filter
        { $set: walletRecord }, // update
        { upsert: true } // create if it doesn't exist
      );
      
      // Also update the startup record
      await db.collection(STARTUPS_COLLECTION).updateOne(
        { _id: startupIdStr }, // filter
        { 
          $set: {
            walletAddress: normalizedWalletAddress,
            founderWalletAddress: normalizedWalletAddress,
            founderId: founderIdStr,
            walletAddressUpdatedAt: new Date()
          }
        },
        { upsert: true } // create if it doesn't exist
      );
      
      console.log(`[wallet-utils] Successfully stored wallet in MongoDB for startup ${startupIdStr}`);
      return true;
    } catch (mongoError) {
      console.error(`[wallet-utils] Error storing startup wallet in MongoDB:`, mongoError);
      return false;
    }
  } catch (error) {
    console.error(`[wallet-utils] Error storing startup wallet address:`, error);
    return false;
  }
}

/**
 * Init wallet addresses for the known founders and startups
 * This ensures the data is in the database
 * 
 * This version is resilient to MongoDB connection issues and does not 
 * throw exceptions that could crash the application startup
 */
export async function initKnownWalletAddresses(): Promise<void> {
  console.log('[wallet-utils] Initializing known wallet addresses to ensure availability');
  
  // Store wallets for all known UIDs - one at a time with individual try/catch
  for (const [uid, wallet] of Object.entries(KNOWN_WALLETS)) {
    try {
      await storeWalletAddress(uid, wallet);
      console.log(`[wallet-utils] Initialized wallet for UID ${uid}: ${wallet}`);
    } catch (error) {
      console.warn(`[wallet-utils] Failed to initialize wallet for UID ${uid}, but continuing: ${error}`);
      // Continue with the next wallet despite errors
    }
  }
  
  // Create startup-founder associations - one at a time with individual try/catch
  const startupAssociations = [
    { startupId: '8126', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' },
    { startupId: '-OO1YSszmiikapY8nDBD', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' },
    { startupId: '2176', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' },
    { startupId: '3718', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' },
    { startupId: '-OOLqBft7_kudlgBYdKn', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' },
    { startupId: '-OOLddX22DvremZi-040', founderId: '5SddFKVv8ydDMPl4sSnrgPazt3c2' }
  ];
  
  for (const { startupId, founderId } of startupAssociations) {
    try {
      const wallet = KNOWN_WALLETS[founderId] || KNOWN_WALLETS['5SddFKVv8ydDMPl4sSnrgPazt3c2'];
      await storeStartupWalletAddress(startupId, founderId, wallet);
      console.log(`[wallet-utils] Initialized wallet association: startup ${startupId} -> founder ${founderId} -> wallet ${wallet}`);
    } catch (error) {
      console.warn(`[wallet-utils] Failed to initialize startup wallet association for startup ${startupId}, but continuing: ${error}`);
      // Continue with the next association despite errors
    }
  }
  
  console.log('[wallet-utils] Completed known wallet address initialization');
}

/**
 * Get a wallet address by user ID
 * Exclusively uses MongoDB for wallet lookups with no fallbacks
 */
export async function getWalletAddressByUserId(userId: number | string): Promise<string | null> {
  const userIdStr = userId.toString();
  
  console.log(`[wallet-utils] Looking up wallet address for user ID: ${userIdStr}`);

  const db = getDB();
  if (!db) {
    console.error(`[wallet-utils] ❌ MongoDB not available for user ${userIdStr}`);
    return null;
  }

  try {
    // Check in the wallet_addresses collection
    const walletDoc = await db.collection(WALLET_COLLECTION).findOne({ userId: userIdStr });
    
    if (walletDoc && walletDoc.walletAddress) {
      console.log(`[wallet-utils] ✅ Found wallet for user ${userIdStr} in MongoDB: ${walletDoc.walletAddress}`);
      return walletDoc.walletAddress;
    }
    
    // If not found in wallet collection, check in users
    const userDoc = await db.collection(USERS_COLLECTION).findOne({ _id: userIdStr });
    
    if (userDoc && userDoc.walletAddress) {
      console.log(`[wallet-utils] ✅ Found wallet in user record from MongoDB: ${userDoc.walletAddress}`);
      return userDoc.walletAddress;
    }
    
    console.log(`[wallet-utils] ❌ No wallet found in MongoDB for user ${userIdStr}`);
    return null;
  } catch (error) {
    console.error(`[wallet-utils] ❌ Error getting wallet from MongoDB for user ${userIdStr}:`, error);
    return null;
  }
}

/**
 * Get a wallet address by MongoDB UID
 * Exclusively uses MongoDB for wallet lookups with no fallbacks
 */
export async function getWalletAddressByMongoUid(mongoUid: string): Promise<string | null> {
  console.log(`[wallet-utils] Looking up wallet for MongoDB UID: ${mongoUid}`);

  const db = getDB();
  if (!db) {
    console.error(`[wallet-utils] ❌ MongoDB not available for MongoDB UID ${mongoUid}`);
    return null;
  }

  try {
    // Check in user_auth collection first
    const userAuthDoc = await db.collection(USER_AUTH_COLLECTION).findOne({ _id: mongoUid });
    
    if (userAuthDoc && userAuthDoc.walletAddress) {
      console.log(`[wallet-utils] ✅ Found wallet in user auth record from MongoDB: ${userAuthDoc.walletAddress}`);
      return userAuthDoc.walletAddress;
    }
    
    // Try wallet_addresses collection next
    const walletDoc = await db.collection(WALLET_COLLECTION).findOne({ userId: mongoUid });
    
    if (walletDoc && walletDoc.walletAddress) {
      console.log(`[wallet-utils] ✅ Found wallet in wallet collection from MongoDB: ${walletDoc.walletAddress}`);
      return walletDoc.walletAddress;
    }
    
    console.log(`[wallet-utils] ❌ No wallet found in MongoDB for MongoDB UID ${mongoUid}`);
    return null;
  } catch (error) {
    console.error(`[wallet-utils] ❌ Error getting wallet from MongoDB for MongoDB UID ${mongoUid}:`, error);
    return null;
  }
}

// Note: No in-memory reverse cache is used. All wallet lookups go directly to MongoDB

/**
 * Get user ID by wallet address
 * Exclusively uses MongoDB for wallet lookups with no fallbacks
 */
export async function getUserIdByWalletAddress(walletAddress: string): Promise<number | null> {
  if (!walletAddress) {
    console.error(`[wallet-utils] Invalid wallet address provided`);
    return null;
  }
  
  // Normalize address
  const normalizedWalletAddress = walletAddress.toLowerCase();
  
  console.log(`[wallet-utils] Looking up user for wallet address: ${normalizedWalletAddress}`);
  
  const db = getDB();
  if (!db) {
    console.error(`[wallet-utils] ❌ MongoDB not available for wallet lookup ${normalizedWalletAddress}`);
    return null;
  }

  try {
    // Query the wallet_addresses collection
    const walletDoc = await db.collection(WALLET_COLLECTION).findOne({ walletAddress: normalizedWalletAddress });
    
    if (walletDoc) {
      const userIdStr = walletDoc.userId || walletDoc._id;
      console.log(`[wallet-utils] ✅ Found user ${userIdStr} for wallet in MongoDB wallet collection`);
      
      const numericId = parseInt(userIdStr);
      return isNaN(numericId) ? null : numericId;
    }
    
    // Query the users collection
    const userDoc = await db.collection(USERS_COLLECTION).findOne({ walletAddress: normalizedWalletAddress });
    
    if (userDoc) {
      const userIdStr = userDoc._id;
      console.log(`[wallet-utils] ✅ Found user ${userIdStr} for wallet in MongoDB users collection`);
      
      const numericId = parseInt(userIdStr);
      return isNaN(numericId) ? null : numericId;
    }
    
    console.log(`[wallet-utils] ❌ No user found in MongoDB for wallet address ${normalizedWalletAddress}`);
    return null;
  } catch (error) {
    console.error(`[wallet-utils] ❌ Error looking up user by wallet address in MongoDB:`, error);
    return null;
  }
}

/**
 * Get a wallet address by startup ID
 * Exclusively uses MongoDB for wallet lookups with absolutely no fallbacks
 */
export async function getWalletAddressByStartupId(startupId: number | string): Promise<string | null> {
  const startupIdStr = startupId.toString();
  
  console.log(`[wallet-utils] Looking up wallet address for startup ID: ${startupIdStr}`);
  
  const db = getDB();
  if (!db) {
    console.error(`[wallet-utils] ❌ MongoDB not available for startup ${startupIdStr}`);
    return null;
  }

  try {
    // Check in startup_wallet_addresses collection first
    const walletDoc = await db.collection(STARTUP_WALLET_COLLECTION).findOne({ startupId: startupIdStr });
    
    if (walletDoc) {
      if (walletDoc.walletAddress) {
        console.log(`[wallet-utils] ✅ Found wallet in startup wallet collection from MongoDB: ${walletDoc.walletAddress}`);
        return walletDoc.walletAddress;
      }
      
      // If no wallet but has founderId, try getting founder's wallet
      if (walletDoc.founderId) {
        const founderWallet = await getWalletAddressByUserId(walletDoc.founderId);
        if (founderWallet) {
          console.log(`[wallet-utils] ✅ Found wallet via founder lookup from MongoDB: ${founderWallet}`);
          
          // Store for future lookups
          storeStartupWalletAddress(startupIdStr, walletDoc.founderId, founderWallet).catch(err =>
            console.warn(`[wallet-utils] Non-critical error storing startup wallet from founder:`, err)
          );
          
          return founderWallet;
        }
      }
    }
    
    // Check in startups collection
    const startupDoc = await db.collection(STARTUPS_COLLECTION).findOne({ _id: startupIdStr });
    
    if (startupDoc) {
      // First try walletAddress in startup record
      if (startupDoc.walletAddress) {
        console.log(`[wallet-utils] ✅ Found wallet in startup record from MongoDB: ${startupDoc.walletAddress}`);
        return startupDoc.walletAddress;
      }
      
      // Next try founderWalletAddress
      if (startupDoc.founderWalletAddress) {
        console.log(`[wallet-utils] ✅ Found founder wallet in startup record from MongoDB: ${startupDoc.founderWalletAddress}`);
        return startupDoc.founderWalletAddress;
      }
      
      // If has founderId, try getting founder's wallet
      if (startupDoc.founderId) {
        const founderWallet = await getWalletAddressByUserId(startupDoc.founderId);
        if (founderWallet) {
          console.log(`[wallet-utils] ✅ Found wallet via founder ID lookup from MongoDB: ${founderWallet}`);
          
          // Store for future lookups
          storeStartupWalletAddress(startupIdStr, startupDoc.founderId, founderWallet).catch(err =>
            console.warn(`[wallet-utils] Non-critical error storing startup wallet from founder ID:`, err)
          );
          
          return founderWallet;
        }
      }
    }
    
    console.log(`[wallet-utils] ❌ No wallet found in MongoDB for startup ${startupIdStr}`);
    return null;
  } catch (error) {
    console.error(`[wallet-utils] ❌ Error getting wallet from MongoDB for startup ${startupIdStr}:`, error);
    return null;
  }
}