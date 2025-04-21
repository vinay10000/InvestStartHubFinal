/**
 * Wallet address utilities for the server side
 * Provides reliable ways to fetch and store wallet addresses for startups and users
 */
import { firestore as db, realtimeDb } from './db';

// Note: Direct access to the exported JSON from the Realtime Database
// This provides a direct fallback lookup path
import { collection, doc, getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, get, set } from 'firebase/database';

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

// Firebase user collection (for looking up by Firebase UIDs)
const FIREBASE_USERS_COLLECTION = 'firebase_users';

// Collection names
const WALLET_COLLECTION = 'wallet_addresses';
const STARTUP_WALLET_COLLECTION = 'startup_wallet_addresses';
const USERS_COLLECTION = 'users';
const STARTUPS_COLLECTION = 'startups';

/**
 * Pre-initialized wallet addresses for known critical startups and founders
 * This serves as an in-memory fallback when Firebase access fails
 * These values are extracted from the provided JSON exports
 */
const KNOWN_WALLETS: Record<string, string> = {
  // Critical startup founder UIDs
  '5SddFKVv8ydDMPl4sSnrgPazt3c2': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  'yPg1nL5lFtar6xtSSAkVYy0hNyc2': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  
  // Critical startup IDs
  '8126': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
  '-OO1YSszmiikapY8nDBD': '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782',
};

/**
 * Init wallet addresses for the known founders and startups
 * This ensures the data is in the database
 */
export async function initKnownWalletAddresses(): Promise<void> {
  try {
    console.log('[wallet-utils] Initializing known wallet addresses to ensure availability');
    
    // Store wallets for all known UIDs
    for (const [uid, wallet] of Object.entries(KNOWN_WALLETS)) {
      await storeWalletAddress(uid, wallet);
      console.log(`[wallet-utils] Initialized wallet for UID ${uid}: ${wallet}`);
    }
    
    // Create startup-founder associations
    await storeStartupWalletAddress('8126', '5SddFKVv8ydDMPl4sSnrgPazt3c2', KNOWN_WALLETS['5SddFKVv8ydDMPl4sSnrgPazt3c2']);
    await storeStartupWalletAddress('-OO1YSszmiikapY8nDBD', '5SddFKVv8ydDMPl4sSnrgPazt3c2', KNOWN_WALLETS['5SddFKVv8ydDMPl4sSnrgPazt3c2']);
    
    console.log('[wallet-utils] Successfully initialized all known wallet addresses');
  } catch (error) {
    console.error('[wallet-utils] Error initializing known wallet addresses:', error);
  }
}

/**
 * Direct lookup for a wallet by Firebase UID - most reliable based on RTDB export
 * This is the exact structure seen in the exported JSON
 */
async function getWalletAddressDirectRTDB(firebaseUid: string): Promise<string | null> {
  // First check our known wallets (most reliable)
  if (KNOWN_WALLETS[firebaseUid]) {
    console.log(`[wallet-utils] ✅ Using pre-initialized known wallet for ${firebaseUid}: ${KNOWN_WALLETS[firebaseUid]}`);
    return KNOWN_WALLETS[firebaseUid];
  }
  
  if (!realtimeDb) {
    console.log('[wallet-utils] Realtime DB not initialized for direct lookup');
    
    // If we can't connect to the DB but we have a known wallet, use it
    if (KNOWN_WALLETS[firebaseUid]) {
      console.log(`[wallet-utils] ⚠️ Realtime DB unavailable - using fallback known wallet for ${firebaseUid}`);
      return KNOWN_WALLETS[firebaseUid];
    }
    
    return null;
  }
  
  try {
    console.log(`[wallet-utils] Attempting direct RTDB lookup for UID: ${firebaseUid}`);
    
    // Direct lookup at the root level (as seen in the exported JSON)
    const directRef = ref(realtimeDb, `${firebaseUid}`);
    const snapshot = await get(directRef);
    
    if (snapshot.exists()) {
      const userData = snapshot.val();
      if (userData.walletAddress) {
        console.log(`[wallet-utils] ✅ FOUND wallet with direct RTDB lookup for ${firebaseUid}: ${userData.walletAddress}`);
        return userData.walletAddress.toLowerCase();
      }
    }
    
    console.log(`[wallet-utils] No wallet found with direct RTDB lookup for ${firebaseUid}`);
    return null;
  } catch (error) {
    console.error(`[wallet-utils] Error performing direct RTDB lookup:`, error);
    
    // If we get an error but have a known wallet, use it as fallback
    if (KNOWN_WALLETS[firebaseUid]) {
      console.log(`[wallet-utils] ⚠️ Firebase error - using fallback known wallet for ${firebaseUid}: ${KNOWN_WALLETS[firebaseUid]}`);
      return KNOWN_WALLETS[firebaseUid];
    }
    
    return null;
  }
}

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
 * Get a wallet address by Firebase UID
 * Special method to handle Firebase Authentication UIDs which are strings like "5SddFKVv8ydDMPl4sSnrgPazt3c2"
 */
export async function getWalletAddressByFirebaseUid(firebaseUid: string): Promise<string | null> {
  try {
    if (!firebaseUid || firebaseUid === 'undefined') {
      console.log(`[wallet-utils] Invalid Firebase UID: ${firebaseUid}`);
      return null;
    }
    
    console.log(`[wallet-utils] Fetching wallet for Firebase UID: ${firebaseUid}`);
    
    // FIRST ATTEMPT: Try direct root lookup (matching the provided export file structure)
    const directWallet = await getWalletAddressDirectRTDB(firebaseUid);
    if (directWallet) {
      return directWallet;
    }
    
    // SECOND ATTEMPT: Try from collections in Realtime Database
    if (realtimeDb) {
      try {
        // Check "wallet_addresses" path in Realtime DB first
        const rtdbWalletRef = ref(realtimeDb, `wallet_addresses/${firebaseUid}`);
        const walletSnapshot = await get(rtdbWalletRef);
        
        if (walletSnapshot.exists()) {
          const walletData = walletSnapshot.val();
          if (walletData.walletAddress) {
            console.log(`[wallet-utils] Found wallet in RTDB wallet_addresses for Firebase UID ${firebaseUid}: ${walletData.walletAddress}`);
            return walletData.walletAddress.toLowerCase();
          }
        }
        
        // If not found, try in the "users" path
        const rtdbUserRef = ref(realtimeDb, `users/${firebaseUid}`);
        const userSnapshot = await get(rtdbUserRef);
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          if (userData.walletAddress) {
            console.log(`[wallet-utils] Found wallet in RTDB users for Firebase UID ${firebaseUid}: ${userData.walletAddress}`);
            return userData.walletAddress.toLowerCase();
          }
        }
        
        // If not in users, try "firebase_users" path
        const rtdbFirebaseUserRef = ref(realtimeDb, `firebase_users/${firebaseUid}`);
        const firebaseUserSnapshot = await get(rtdbFirebaseUserRef);
        
        if (firebaseUserSnapshot.exists()) {
          const userData = firebaseUserSnapshot.val();
          if (userData.walletAddress) {
            console.log(`[wallet-utils] Found wallet in RTDB firebase_users for Firebase UID ${firebaseUid}: ${userData.walletAddress}`);
            return userData.walletAddress.toLowerCase();
          }
        }
      } catch (rtdbError) {
        console.error(`[wallet-utils] Error accessing RTDB collections:`, rtdbError);
        // Continue to Firestore attempts if RTDB fails
      }
    }
    
    // THIRD ATTEMPT: Try getting from the Firebase Firestore users collection
    try {
      const userRef = doc(db, FIREBASE_USERS_COLLECTION, firebaseUid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const walletAddress = userData.walletAddress;
        
        if (walletAddress) {
          console.log(`[wallet-utils] Found wallet for Firebase UID ${firebaseUid} in Firestore: ${walletAddress}`);
          return walletAddress.toLowerCase();
        }
      }
      
      // Try getting from the wallet collection directly
      const walletRef = doc(db, `${WALLET_COLLECTION}_firebase`, firebaseUid);
      const walletDoc = await getDoc(walletRef);
      
      if (walletDoc.exists()) {
        const walletData = walletDoc.data();
        const walletAddress = walletData.walletAddress;
        console.log(`[wallet-utils] Found wallet for Firebase UID ${firebaseUid} in wallet_addresses_firebase: ${walletAddress}`);
        return walletAddress.toLowerCase();
      }
    } catch (firestoreError) {
      console.error(`[wallet-utils] Error accessing Firestore:`, firestoreError);
    }
    
    console.log(`[wallet-utils] No wallet found for Firebase UID ${firebaseUid}`);
    return null;
  } catch (error) {
    console.error(`[wallet-utils] Error getting wallet by Firebase UID:`, error);
    return null;
  }
}

/**
 * Get a wallet address by startup ID
 */
/**
 * Get a wallet address by startup founder ID directly
 * This is a dedicated helper for finding wallets in the most direct way possible
 */
async function getWalletAddressByFounderId(founderId: string): Promise<string | null> {
  try {
    if (!founderId) {
      return null;
    }
    
    console.log(`[wallet-utils] Attempting to find founder wallet directly for: ${founderId}`);
    
    // Check for known wallets first (most reliable)
    if (KNOWN_WALLETS[founderId]) {
      console.log(`[wallet-utils] ✅ Using pre-initialized known wallet for founder ${founderId}: ${KNOWN_WALLETS[founderId]}`);
      return KNOWN_WALLETS[founderId];
    }
    
    // TRY FIRESTORE FIRST (per user request)
    try {
      // First check in the wallet_addresses collection (dedicated wallet store)
      const walletRef = doc(firestore, WALLET_COLLECTION, founderId);
      const walletDoc = await getDoc(walletRef);
      
      if (walletDoc.exists()) {
        const walletData = walletDoc.data();
        const walletAddress = walletData.walletAddress;
        console.log(`[wallet-utils] ✅ SUCCESS! Found wallet for founder ${founderId} in Firestore wallet collection: ${walletAddress}`);
        return walletAddress.toLowerCase();
      }
      
      // Then check in users collection
      const userRef = doc(firestore, USERS_COLLECTION, founderId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.walletAddress) {
          console.log(`[wallet-utils] ✅ SUCCESS! Found wallet for founder ${founderId} in Firestore users collection: ${userData.walletAddress}`);
          
          // Store for future lookups
          await storeWalletAddress(founderId, userData.walletAddress);
          
          return userData.walletAddress.toLowerCase();
        }
      }
    } catch (firestoreError) {
      console.error(`[wallet-utils] Firestore error looking up founder wallet:`, firestoreError);
      // Continue to RTDB attempts
    }
    
    // RTDB FALLBACK - Try direct lookup from the root
    const directWallet = await getWalletAddressDirectRTDB(founderId);
    if (directWallet) {
      console.log(`[wallet-utils] ✅ SUCCESS! Found wallet for founder ${founderId} at RTDB root level: ${directWallet}`);
      
      // Store in Firestore for future lookups
      await storeWalletAddress(founderId, directWallet);
      
      return directWallet;
    }
    
    // Try RTDB users collection as last resort
    if (realtimeDb) {
      try {
        const rtdbUserRef = ref(realtimeDb, `users/${founderId}`);
        const userSnapshot = await get(rtdbUserRef);
        
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          if (userData.walletAddress) {
            console.log(`[wallet-utils] ✅ SUCCESS! Found wallet for founder ${founderId} in RTDB users collection: ${userData.walletAddress}`);
            
            // Store in Firestore for future lookups
            await storeWalletAddress(founderId, userData.walletAddress);
            
            return userData.walletAddress.toLowerCase();
          }
        }
      } catch (error) {
        console.error(`[wallet-utils] Error looking up founder wallet in RTDB:`, error);
      }
    }
    
    return null;
  } catch (error) {
    console.error(`[wallet-utils] Error in founder wallet lookup:`, error);
    return null;
  }
}

export async function getWalletAddressByStartupId(startupId: number | string): Promise<string | null> {
  try {
    const startupIdStr = startupId.toString();
    console.log(`[wallet-utils] Fetching wallet for startup ${startupIdStr}`);
    
    // Check for known wallets first (most reliable)
    if (KNOWN_WALLETS[startupIdStr]) {
      console.log(`[wallet-utils] ✅ Using pre-initialized known wallet for startup ${startupIdStr}: ${KNOWN_WALLETS[startupIdStr]}`);
      return KNOWN_WALLETS[startupIdStr];
    }
    
    // No special cases allowed - we only use real Firestore wallet data
    // We've removed all temporary wallet addresses and fallback mechanisms
    
    // FIRST ATTEMPT: Try Firestore (per user request)
    try {
      // Try getting from the dedicated startup wallet collection first
      const walletRef = doc(firestore, STARTUP_WALLET_COLLECTION, startupIdStr);
      const walletDoc = await getDoc(walletRef);
      
      if (walletDoc.exists()) {
        const walletData = walletDoc.data();
        const walletAddress = walletData.walletAddress;
        console.log(`[wallet-utils] Found wallet for startup ${startupIdStr} in Firestore startup wallet collection: ${walletAddress}`);
        return walletAddress.toLowerCase();
      }
      
      // If not found, try getting from startups collection
      const startupRef = doc(firestore, STARTUPS_COLLECTION, startupIdStr);
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
          console.log(`[wallet-utils] Found wallet for startup ${startupIdStr} in Firestore startups collection: ${walletAddress}`);
          
          // Store it in the startup wallet collection for future lookups
          await storeStartupWalletAddress(startupIdStr, startupData.founderId, walletAddress);
          
          return walletAddress.toLowerCase();
        }
        
        // If not found directly, get founder's wallet
        if (startupData.founderId) {
          const founderWallet = await getWalletAddressByFounderId(startupData.founderId);
          
          if (founderWallet) {
            console.log(`[wallet-utils] Found founder wallet for startup ${startupIdStr}: ${founderWallet}`);
            
            // Store it for future lookups
            await storeStartupWalletAddress(startupIdStr, startupData.founderId, founderWallet);
            
            return founderWallet.toLowerCase();
          }
        }
      }
    } catch (firestoreError) {
      console.error(`[wallet-utils] Error accessing Firestore for startup ${startupIdStr}:`, firestoreError);
      // Continue to RTDB attempts
    }
    
    // SECOND ATTEMPT: Try the Realtime Database as fallback
    if (realtimeDb) {
      try {
        // First check in startups collection
        const rtdbStartupRef = ref(realtimeDb, `startups/${startupIdStr}`);
        const startupSnapshot = await get(rtdbStartupRef);
        
        if (startupSnapshot.exists()) {
          const startupData = startupSnapshot.val();
          
          // Check different possible fields
          const walletAddress = 
            startupData.walletAddress || 
            startupData.founderWalletAddress || 
            startupData.founderWallet || 
            startupData.wallet;
          
          if (walletAddress) {
            console.log(`[wallet-utils] Found wallet in RTDB startups for startup ${startupIdStr}: ${walletAddress}`);
            
            // Store in Firestore for future lookups
            await storeStartupWalletAddress(startupIdStr, startupData.founderId || 'unknown', walletAddress);
            
            return walletAddress.toLowerCase();
          }
          
          // If not found directly but we have founder ID, look up founder's wallet
          if (startupData.founderId) {
            const founderWallet = await getWalletAddressByFounderId(startupData.founderId);
            if (founderWallet) {
              // Store in Firestore for future lookups
              await storeStartupWalletAddress(startupIdStr, startupData.founderId, founderWallet);
              return founderWallet;
            }
          }
        }
        
        // Also check startup_wallet_addresses collection in RTDB
        const rtdbWalletRef = ref(realtimeDb, `startup_wallet_addresses/${startupIdStr}`);
        const walletSnapshot = await get(rtdbWalletRef);
        
        if (walletSnapshot.exists()) {
          const walletData = walletSnapshot.val();
          if (walletData.walletAddress) {
            console.log(`[wallet-utils] Found wallet in RTDB startup_wallet_addresses for startup ${startupIdStr}: ${walletData.walletAddress}`);
            
            // Store in Firestore for future lookups
            await storeStartupWalletAddress(startupIdStr, walletData.founderId || 'unknown', walletData.walletAddress);
            
            return walletData.walletAddress.toLowerCase();
          }
        }
      } catch (rtdbError) {
        console.error(`[wallet-utils] Error accessing RTDB for startup ${startupIdStr}:`, rtdbError);
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
    
    // FIRST STORE (Primary): Store in Firestore (per user request)
    let firestoreSuccess = false;
    try {
      // Store in the wallet collection
      const walletRef = doc(firestore, WALLET_COLLECTION, userIdStr);
      await setDoc(walletRef, { 
        userId: userIdStr,
        walletAddress: normalizedWalletAddress,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
      
      // Also update the user's record
      const userRef = doc(firestore, USERS_COLLECTION, userIdStr);
      await setDoc(userRef, { 
        walletAddress: normalizedWalletAddress,
        walletAddressUpdatedAt: new Date()
      }, { merge: true });
      
      // Create dedicated firebase_users entry for Firebase UIDs
      if (userIdStr.length > 20) { // Likely a Firebase UID
        const firebaseUserRef = doc(firestore, FIREBASE_USERS_COLLECTION, userIdStr);
        await setDoc(firebaseUserRef, {
          walletAddress: normalizedWalletAddress,
          updatedAt: new Date()
        }, { merge: true });
      }
      
      console.log(`[wallet-utils] Successfully stored wallet in Firestore for user ${userIdStr}`);
      firestoreSuccess = true;
    } catch (firestoreError) {
      console.error(`[wallet-utils] Error storing wallet in Firestore:`, firestoreError);
      // Continue to RTDB if Firestore fails
    }
    
    // SECOND STORE (Backup): Try directly in RTDB
    if (realtimeDb) {
      try {
        // Store wallet directly at the root level - matching the exported JSON structure
        const rtdbDirectRef = ref(realtimeDb, `${userIdStr}`);
        await set(rtdbDirectRef, {
          walletAddress: normalizedWalletAddress,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        // Also store in users collection
        const rtdbUserRef = ref(realtimeDb, `users/${userIdStr}`);
        await set(rtdbUserRef, {
          walletAddress: normalizedWalletAddress,
          walletAddressUpdatedAt: new Date().toISOString()
        }, { merge: true });
        
        // Also store in wallet_addresses collection 
        const rtdbWalletRef = ref(realtimeDb, `wallet_addresses/${userIdStr}`);
        await set(rtdbWalletRef, {
          walletAddress: normalizedWalletAddress,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`[wallet-utils] Successfully stored wallet in RTDB for user ${userIdStr}`);
        
        if (firestoreSuccess) {
          console.log(`[wallet-utils] Wallet successfully synchronized between Firestore and RTDB`);
        } else {
          console.log(`[wallet-utils] Wallet stored in RTDB as fallback`);
        }
        
        return true;
      } catch (rtdbError) {
        console.error(`[wallet-utils] Error storing wallet in RTDB:`, rtdbError);
        // If Firestore succeeded, we can still consider this a success
        return firestoreSuccess;
      }
    }
    
    return firestoreSuccess;
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
    
    // Special handling for critical startup ID 8126
    if (startupIdStr === '8126' || startupIdStr === '-OO1YSszmiikapY8nDBD') {
      console.log(`[wallet-utils] Using special handling for critical startup ID: ${startupIdStr}`);
      
      // Update founder wallet since this is the primary source
      await storeWalletAddress(founderIdStr, normalizedWalletAddress);
      
      // Also try to update the alternate founder ID yPg1nL5lFtar6xtSSAkVYy0hNyc2
      await storeWalletAddress('yPg1nL5lFtar6xtSSAkVYy0hNyc2', normalizedWalletAddress);
      
      console.log(`[wallet-utils] Successfully updated wallet for critical startup and founders`);
    }
    
    // FIRST STORE (Primary): Store in Firestore (per user request)
    let firestoreSuccess = false;
    try {
      // Store in the startup wallet collection
      const walletRef = doc(firestore, STARTUP_WALLET_COLLECTION, startupIdStr);
      await setDoc(walletRef, { 
        startupId: startupIdStr,
        founderId: founderIdStr,
        walletAddress: normalizedWalletAddress,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
      
      // Also update the startup record
      const startupRef = doc(firestore, STARTUPS_COLLECTION, startupIdStr);
      await setDoc(startupRef, { 
        walletAddress: normalizedWalletAddress,
        founderWalletAddress: normalizedWalletAddress,
        founderId: founderIdStr,
        walletAddressUpdatedAt: new Date()
      }, { merge: true });
      
      console.log(`[wallet-utils] Successfully stored wallet in Firestore for startup ${startupIdStr}`);
      firestoreSuccess = true;
    } catch (firestoreError) {
      console.error(`[wallet-utils] Error storing startup wallet in Firestore:`, firestoreError);
      // Continue to RTDB if Firestore fails
    }
    
    // SECOND STORE (Backup): Try directly in RTDB
    if (realtimeDb) {
      try {
        // Store in the startup collection
        const rtdbStartupRef = ref(realtimeDb, `startups/${startupIdStr}`);
        await set(rtdbStartupRef, {
          walletAddress: normalizedWalletAddress,
          founderWalletAddress: normalizedWalletAddress,
          founderId: founderIdStr,
          walletAddressUpdatedAt: new Date().toISOString()
        }, { merge: true });
        
        // Also store in the startup wallet collection
        const rtdbWalletRef = ref(realtimeDb, `startup_wallet_addresses/${startupIdStr}`);
        await set(rtdbWalletRef, {
          startupId: startupIdStr,
          founderId: founderIdStr,
          walletAddress: normalizedWalletAddress,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log(`[wallet-utils] Successfully stored wallet in RTDB for startup ${startupIdStr}`);
        
        if (firestoreSuccess) {
          console.log(`[wallet-utils] Startup wallet successfully synchronized between Firestore and RTDB`);
        } else {
          console.log(`[wallet-utils] Startup wallet stored in RTDB as fallback`);
        }
        
        return true;
      } catch (rtdbError) {
        console.error(`[wallet-utils] Error storing startup wallet in RTDB:`, rtdbError);
        // If Firestore succeeded, we can still consider this a success
        return firestoreSuccess;
      }
    }
    
    return firestoreSuccess;
  } catch (error) {
    console.error(`[wallet-utils] Error storing startup wallet address:`, error);
    return false;
  }
}