/**
 * Wallet address utilities for the server side
 * Provides reliable ways to fetch and store wallet addresses for startups and users
 */
import { firestore as db } from './db';

// Ensure we have a valid Firestore instance
// Firestore safety wrapper to handle the case where db might be null
const safeFirestore = {
  doc: (collection: string, docId: string) => {
    if (!db) {
      console.error('[wallet-utils] Firestore is not initialized!');
      throw new Error('Firestore is not initialized');
    }
    return doc(db, collection, docId);
  },
  collection: (collectionName: string) => {
    if (!db) {
      console.error('[wallet-utils] Firestore is not initialized!');
      throw new Error('Firestore is not initialized');
    }
    return collection(db, collectionName);
  }
}
import { collection, doc, getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';

// Collection names
const WALLET_COLLECTION = 'wallet_addresses';
const STARTUP_WALLET_COLLECTION = 'startup_wallet_addresses';
const USERS_COLLECTION = 'users';
const STARTUPS_COLLECTION = 'startups';

/**
 * Get a wallet address by user ID
 */
export async function getWalletAddressByUserId(userId: number | string): Promise<string | null> {
  try {
    const userIdStr = userId.toString();
    console.log(`[wallet-utils] Fetching wallet for user ${userIdStr}`);
    
    // Try getting from the dedicated wallet collection first
    const walletRef = safeFirestore.doc(WALLET_COLLECTION, userIdStr);
    const walletDoc = await getDoc(walletRef);
    
    if (walletDoc.exists()) {
      const walletData = walletDoc.data();
      const walletAddress = walletData.walletAddress;
      console.log(`[wallet-utils] Found wallet for user ${userIdStr} in wallet collection: ${walletAddress}`);
      return walletAddress;
    }
    
    // If not found, try getting from users collection
    const userRef = doc(db, USERS_COLLECTION, userIdStr);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const walletAddress = userData.walletAddress;
      
      if (walletAddress) {
        console.log(`[wallet-utils] Found wallet for user ${userIdStr} in user collection: ${walletAddress}`);
        
        // Store for future lookups in the wallet collection
        await storeWalletAddress(userIdStr, walletAddress);
        
        return walletAddress;
      }
    }
    
    console.log(`[wallet-utils] No wallet found for user ${userIdStr}`);
    return null;
  } catch (error) {
    console.error(`[wallet-utils] Error getting wallet by user ID:`, error);
    return null;
  }
}

/**
 * Get a wallet address by startup ID
 */
export async function getWalletAddressByStartupId(startupId: number | string): Promise<string | null> {
  try {
    const startupIdStr = startupId.toString();
    console.log(`[wallet-utils] Fetching wallet for startup ${startupIdStr}`);
    
    // Try getting from the dedicated startup wallet collection first
    const walletRef = doc(db, STARTUP_WALLET_COLLECTION, startupIdStr);
    const walletDoc = await getDoc(walletRef);
    
    if (walletDoc.exists()) {
      const walletData = walletDoc.data();
      const walletAddress = walletData.walletAddress;
      console.log(`[wallet-utils] Found wallet for startup ${startupIdStr} in startup wallet collection: ${walletAddress}`);
      return walletAddress;
    }
    
    // If not found, try getting from startups collection
    const startupRef = doc(db, STARTUPS_COLLECTION, startupIdStr);
    const startupDoc = await getDoc(startupRef);
    
    if (startupDoc.exists()) {
      const startupData = startupDoc.data();
      
      // Check different possible fields
      const walletAddress = 
        startupData.walletAddress || 
        startupData.founderWalletAddress || 
        startupData.founderWallet || 
        startupData.wallet;
      
      if (walletAddress) {
        console.log(`[wallet-utils] Found wallet for startup ${startupIdStr} in startups collection: ${walletAddress}`);
        
        // Store it in the startup wallet collection for future lookups
        await storeStartupWalletAddress(startupIdStr, startupData.founderId, walletAddress);
        
        return walletAddress;
      }
      
      // If not found directly, get founder's wallet
      if (startupData.founderId) {
        const founderWallet = await getWalletAddressByUserId(startupData.founderId);
        
        if (founderWallet) {
          console.log(`[wallet-utils] Found founder wallet for startup ${startupIdStr}: ${founderWallet}`);
          
          // Store it for future lookups
          await storeStartupWalletAddress(startupIdStr, startupData.founderId, founderWallet);
          
          return founderWallet;
        }
      }
    }
    
    console.log(`[wallet-utils] No wallet found for startup ${startupIdStr}`);
    return null;
  } catch (error) {
    console.error(`[wallet-utils] Error getting wallet by startup ID:`, error);
    return null;
  }
}

/**
 * Get user ID by wallet address
 */
export async function getUserIdByWalletAddress(walletAddress: string): Promise<number | null> {
  try {
    console.log(`[wallet-utils] Fetching user ID for wallet ${walletAddress}`);
    
    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    // Search in wallet collection
    const walletQuery = query(
      collection(db, WALLET_COLLECTION),
      where('walletAddress', '==', normalizedWalletAddress)
    );
    
    const walletDocs = await getDocs(walletQuery);
    
    if (!walletDocs.empty) {
      const userId = walletDocs.docs[0].id;
      console.log(`[wallet-utils] Found user ID ${userId} for wallet ${walletAddress} in wallet collection`);
      return Number(userId);
    }
    
    // If not found, search in users collection
    const userQuery = query(
      collection(db, USERS_COLLECTION),
      where('walletAddress', '==', normalizedWalletAddress)
    );
    
    const userDocs = await getDocs(userQuery);
    
    if (!userDocs.empty) {
      const userId = userDocs.docs[0].id;
      console.log(`[wallet-utils] Found user ID ${userId} for wallet ${walletAddress} in users collection`);
      
      // Store in wallet collection for future lookups
      await storeWalletAddress(userId, normalizedWalletAddress);
      
      return Number(userId);
    }
    
    console.log(`[wallet-utils] No user found for wallet ${walletAddress}`);
    return null;
  } catch (error) {
    console.error(`[wallet-utils] Error getting user ID by wallet address:`, error);
    return null;
  }
}

/**
 * Store a wallet address for a user
 */
export async function storeWalletAddress(
  userId: number | string,
  walletAddress: string
): Promise<boolean> {
  try {
    const userIdStr = userId.toString();
    
    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    console.log(`[wallet-utils] Storing wallet ${normalizedWalletAddress} for user ${userIdStr}`);
    
    // Store in the wallet collection
    const walletRef = doc(db, WALLET_COLLECTION, userIdStr);
    await setDoc(walletRef, { 
      userId: userIdStr,
      walletAddress: normalizedWalletAddress,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });
    
    // Also update the user's record
    const userRef = doc(db, USERS_COLLECTION, userIdStr);
    await setDoc(userRef, { 
      walletAddress: normalizedWalletAddress,
      walletAddressUpdatedAt: new Date()
    }, { merge: true });
    
    console.log(`[wallet-utils] Successfully stored wallet for user ${userIdStr}`);
    return true;
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
    
    // Store in the startup wallet collection
    const walletRef = doc(db, STARTUP_WALLET_COLLECTION, startupIdStr);
    await setDoc(walletRef, { 
      startupId: startupIdStr,
      founderId: founderIdStr,
      walletAddress: normalizedWalletAddress,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });
    
    // Also update the startup record
    const startupRef = doc(db, STARTUPS_COLLECTION, startupIdStr);
    await setDoc(startupRef, { 
      walletAddress: normalizedWalletAddress,
      founderWalletAddress: normalizedWalletAddress,
      walletAddressUpdatedAt: new Date()
    }, { merge: true });
    
    console.log(`[wallet-utils] Successfully stored wallet for startup ${startupIdStr}`);
    return true;
  } catch (error) {
    console.error(`[wallet-utils] Error storing startup wallet address:`, error);
    return false;
  }
}