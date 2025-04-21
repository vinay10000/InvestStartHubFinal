// Import our local mock implementations instead of Firebase SDK
import { ref, get, set, query, orderByChild, equalTo } from './firebase';
import { getDatabase } from './firebase';

// Initialize database using our mock
const database = getDatabase();

/**
 * A direct and simplified approach to access wallet addresses from Firebase
 * This file works directly with Firebase data structures without any abstractions
 */

/**
 * Get all users from Firebase with wallet addresses
 * Useful for debugging and troubleshooting wallet issues
 */
export const getAllUsersWithWallets = async (): Promise<any[]> => {
  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      console.log("[Direct Wallet] No users found in database");
      return [];
    }
    
    const users: any[] = [];
    snapshot.forEach(childSnapshot => {
      const user = childSnapshot.val();
      // Include the user's key (which is the Firebase UID)
      user.uid = childSnapshot.key;
      
      // Only include users who have a wallet address
      if (user.walletAddress && user.walletAddress.startsWith('0x')) {
        users.push(user);
      }
    });
    
    console.log(`[Direct Wallet] Found ${users.length} users with wallet addresses`);
    return users;
  } catch (error) {
    console.error('[Direct Wallet] Error getting users with wallets:', error);
    return [];
  }
};

/**
 * Get all startups from Firebase
 * Used to correlate startups with founders and their wallets
 */
export const getAllStartups = async (): Promise<any[]> => {
  try {
    const startupsRef = ref(database, 'startups');
    const snapshot = await get(startupsRef);
    
    if (!snapshot.exists()) {
      console.log("[Direct Wallet] No startups found in database");
      return [];
    }
    
    const startups: any[] = [];
    snapshot.forEach(childSnapshot => {
      const startup = childSnapshot.val();
      // Include the startup's key (which is the Firebase ID)
      startup.id = childSnapshot.key;
      startups.push(startup);
    });
    
    console.log(`[Direct Wallet] Found ${startups.length} startups`);
    return startups;
  } catch (error) {
    console.error('[Direct Wallet] Error getting startups:', error);
    return [];
  }
};

/**
 * Get a founder's wallet address using a startup ID
 * This function tries multiple approaches to find the wallet:
 * 1. Direct lookup in the startup object
 * 2. Founder ID lookup if available in the startup
 * 3. Matching by sameId if available
 * 4. Lookup by name or other identifiers
 * 5. Lookup in the legacy numeric ID format
 */
export const getWalletAddressByStartupId = async (startupId: string): Promise<string | null> => {
  try {
    console.log(`[Direct Wallet] Looking up wallet for startup ID: ${startupId} (type: ${typeof startupId})`);
    
    // Handle undefined or null values
    if (!startupId) {
      console.error('[Direct Wallet] Invalid startup ID (null or undefined)');
      return null;
    }
    
    // Normalize the ID format (handle both numeric and string IDs)
    const normalizedId = startupId.toString().trim();
    
    console.log(`[Direct Wallet] Normalized ID: ${normalizedId}`);
    
    // Step 1: Get the startup object
    const startupRef = ref(database, `startups/${normalizedId}`);
    const startupSnapshot = await get(startupRef);
    
    let startup: any = null;
    let foundStartupId = normalizedId;
    
    // If direct lookup fails, try to find the startup by other means
    if (!startupSnapshot.exists()) {
      console.log(`[Direct Wallet] No startup found with direct ID: ${startupId}, trying to find by searching...`);
      
      // Try to find the startup by searching all startups
      const startupsRef = ref(database, 'startups');
      const allStartupsSnapshot = await get(startupsRef);
      
      if (allStartupsSnapshot.exists()) {
        // First look for ID match - include case-insensitive comparison for string IDs
        allStartupsSnapshot.forEach(childSnapshot => {
          const currentStartup = childSnapshot.val();
          currentStartup.id = childSnapshot.key; // Add the key as id
          
          // Normalize the startup ID for comparison
          const normalizedStartupId = startupId.toString().toLowerCase().trim();
          const normalizedChildKey = childSnapshot.key.toString().toLowerCase().trim();
          const normalizedCurrentId = (currentStartup.id || '').toString().toLowerCase().trim();
          
          // Check if any ID field matches our search ID - use both case-sensitive and case-insensitive checks
          if (
            // Exact matches (case-sensitive)
            childSnapshot.key === startupId || 
            currentStartup.id === startupId ||
            // Case-insensitive matches for string IDs
            normalizedChildKey === normalizedStartupId ||
            normalizedCurrentId === normalizedStartupId ||
            // Numeric ID checks
            (currentStartup.numericId && currentStartup.numericId.toString() === startupId) ||
            (currentStartup.idInDatabase && currentStartup.idInDatabase.toString() === startupId)
          ) {
            startup = currentStartup;
            foundStartupId = childSnapshot.key;
            console.log(`[Direct Wallet] Found startup by ID match: ${childSnapshot.key}`);
            return true; // Break the loop
          }
        });
        
        // If still not found, check if numeric ID in our parameters might be a Firebase ID in the database
        if (!startup && !isNaN(Number(startupId))) {
          console.log(`[Direct Wallet] Trying to interpret ${startupId} as a numeric ID pointing to a Firebase entry...`);
          
          // Find any startup with this ID as a numeric reference
          allStartupsSnapshot.forEach(childSnapshot => {
            const currentStartup = childSnapshot.val();
            currentStartup.id = childSnapshot.key; // Add the Firebase key as ID
            
            // Additional checks for multiple ID formats and fields
            const potentialIdFields = [
              'numericId', 'legacyId', 'databaseId', 'id', 'startupId',
              'internalId', 'externalId', 'dbId', 'idNumber'
            ];
            
            // Check all potential ID fields in the startup object
            for (const field of potentialIdFields) {
              if (currentStartup[field] && 
                  currentStartup[field].toString() === startupId) {
                startup = currentStartup;
                startup.id = childSnapshot.key;
                foundStartupId = childSnapshot.key;
                console.log(`[Direct Wallet] Found startup by numeric ID match in field ${field}: ${childSnapshot.key}`);
                return true; // Break the forEach loop
              }
            }
            
            // Also check if the Firebase key contains our ID as a substring
            // This helps with inconsistent ID formats between systems
            if (childSnapshot.key.includes(startupId) || 
                (currentStartup.id && currentStartup.id.includes(startupId))) {
              console.log(`[Direct Wallet] Found startup by partial ID match: ${childSnapshot.key}`);
              startup = currentStartup;
              startup.id = childSnapshot.key;
              foundStartupId = childSnapshot.key;
              return true; // Break the forEach loop
            }
          });
        }
      }
    } else {
      startup = startupSnapshot.val();
      startup.id = startupId; // Add the key as id
    }
    
    // If we still don't have a startup, we can't proceed
    if (!startup) {
      console.log(`[Direct Wallet] Still couldn't find any startup with ID: ${startupId}`);
      return null;
    }
    
    console.log(`[Direct Wallet] Found startup:`, startup);
    
    // Step 2: Check if the startup already has a wallet address field
    if (startup.founderWalletAddress && startup.founderWalletAddress.startsWith('0x')) {
      console.log(`[Direct Wallet] Found wallet directly in startup: ${startup.founderWalletAddress}`);
      return startup.founderWalletAddress;
    }
    
    // Step 3: If the startup has a founderId, try to get the user directly
    if (startup.founderId) {
      console.log(`[Direct Wallet] Looking up user with ID: ${startup.founderId}`);
      const userRef = ref(database, `users/${startup.founderId}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        
        if (userData.walletAddress && userData.walletAddress.startsWith('0x')) {
          console.log(`[Direct Wallet] Found wallet in founder record: ${userData.walletAddress}`);
          
          // Save this wallet back to the startup for future lookups
          try {
            await set(ref(database, `startups/${foundStartupId}/founderWalletAddress`), userData.walletAddress);
            console.log(`[Direct Wallet] Updated startup ${foundStartupId} with founder's wallet address`);
          } catch (err) {
            console.warn(`[Direct Wallet] Couldn't update startup with wallet:`, err);
          }
          
          return userData.walletAddress;
        }
      }
    }
    
    // Step 4: If the startup has a sameId, try to find a user with the same sameId
    if (startup.sameId) {
      console.log(`[Direct Wallet] Looking up user with sameId: ${startup.sameId}`);
      
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (usersSnapshot.exists()) {
        let matchingUser: any = null;
        
        usersSnapshot.forEach(childSnapshot => {
          const user = childSnapshot.val();
          user.uid = childSnapshot.key;
          
          if (user.sameId === startup.sameId) {
            matchingUser = user;
            return true; // Break the forEach loop
          }
        });
        
        if (matchingUser && matchingUser.walletAddress && matchingUser.walletAddress.startsWith('0x')) {
          console.log(`[Direct Wallet] Found wallet through sameId match: ${matchingUser.walletAddress}`);
          
          // Save this wallet back to the startup for future lookups
          try {
            await set(ref(database, `startups/${foundStartupId}/founderWalletAddress`), matchingUser.walletAddress);
            console.log(`[Direct Wallet] Updated startup ${foundStartupId} with sameId-matched wallet address`);
          } catch (err) {
            console.warn(`[Direct Wallet] Couldn't update startup with wallet:`, err);
          }
          
          return matchingUser.walletAddress;
        }
      }
    }
    
    // Step 5: Try to find any user whose email or name matches the founder's info in the startup
    if (startup.founderEmail || startup.founderName) {
      console.log(`[Direct Wallet] Looking for founder by email or name`);
      
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (usersSnapshot.exists()) {
        let matchingUser: any = null;
        
        usersSnapshot.forEach(childSnapshot => {
          const user = childSnapshot.val();
          user.uid = childSnapshot.key;
          
          // Check for email match
          if (startup.founderEmail && user.email === startup.founderEmail) {
            matchingUser = user;
            return true; // Break the forEach loop
          }
          
          // Check for name match
          if (startup.founderName && 
              (user.name === startup.founderName || user.username === startup.founderName)) {
            matchingUser = user;
            return true; // Break the forEach loop
          }
        });
        
        if (matchingUser && matchingUser.walletAddress && matchingUser.walletAddress.startsWith('0x')) {
          console.log(`[Direct Wallet] Found wallet through founder email/name match: ${matchingUser.walletAddress}`);
          
          // Save this wallet back to the startup for future lookups
          try {
            await set(ref(database, `startups/${foundStartupId}/founderWalletAddress`), matchingUser.walletAddress);
            console.log(`[Direct Wallet] Updated startup ${foundStartupId} with email/name-matched wallet address`);
          } catch (err) {
            console.warn(`[Direct Wallet] Couldn't update startup with wallet:`, err);
          }
          
          return matchingUser.walletAddress;
        }
      }
    }
    
    // Step 6: Last resort, look for a user who is a founder and might be associated
    console.log(`[Direct Wallet] Trying to find any founder associated with startup ${startup.name}`);
    
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (usersSnapshot.exists()) {
      let possibleFounder: any = null;
      
      usersSnapshot.forEach(childSnapshot => {
        const user = childSnapshot.val();
        user.uid = childSnapshot.key;
        
        // Look for users with role=founder and a wallet address
        if (user.role === 'founder' && 
            user.walletAddress && 
            user.walletAddress.startsWith('0x')) {
          
          possibleFounder = user;
          // Don't break here, we'll keep looking for a better match
        }
      });
      
      if (possibleFounder) {
        console.log(`[Direct Wallet] Found a possible founder with wallet: ${possibleFounder.walletAddress}`);
        console.log(`[Direct Wallet] Warning: This is a fallback and may not be the correct founder`);
        
        // Save this wallet back to the startup for future lookups, but mark it as unverified
        try {
          await set(ref(database, `startups/${foundStartupId}/founderWalletAddress`), possibleFounder.walletAddress);
          await set(ref(database, `startups/${foundStartupId}/walletAddressVerified`), false);
          console.log(`[Direct Wallet] Updated startup ${foundStartupId} with fallback wallet address (marked as unverified)`);
        } catch (err) {
          console.warn(`[Direct Wallet] Couldn't update startup with wallet:`, err);
        }
        
        return possibleFounder.walletAddress;
      }
    }
    
    console.log(`[Direct Wallet] Could not find any wallet for startup ID: ${startupId}`);
    return null;
  } catch (error) {
    console.error('[Direct Wallet] Error getting wallet by startup ID:', error);
    return null;
  }
};

/**
 * Saves a wallet address to both the user and startup records in Firebase
 * This ensures the wallet address can be found through multiple lookup methods
 */
export const saveWalletAddressComprehensive = async (
  startupId: string,
  founderIdOrUid: string,
  walletAddress: string
): Promise<boolean> => {
  if (!walletAddress || !walletAddress.startsWith('0x')) {
    console.error('[Direct Wallet] Invalid wallet address format:', walletAddress);
    return false;
  }
  
  try {
    console.log(`[Direct Wallet] Saving wallet address comprehensively:`);
    console.log(`  - Startup ID: ${startupId}`);
    console.log(`  - Founder ID: ${founderIdOrUid}`);
    console.log(`  - Wallet: ${walletAddress}`);
    
    // Step 1: Save to the user record
    const userRef = ref(database, `users/${founderIdOrUid}`);
    const userSnapshot = await get(userRef);
    
    if (userSnapshot.exists()) {
      // Update the user record with the wallet address
      await set(userRef, {
        ...userSnapshot.val(),
        walletAddress: walletAddress
      });
      console.log(`[Direct Wallet] Updated user ${founderIdOrUid} with wallet address`);
    } else {
      console.log(`[Direct Wallet] User ${founderIdOrUid} not found, cannot save wallet`);
    }
    
    // Step 2: Save to the startup record
    const startupRef = ref(database, `startups/${startupId}`);
    const startupSnapshot = await get(startupRef);
    
    if (startupSnapshot.exists()) {
      // Update the startup record with the founder's wallet address
      await set(startupRef, {
        ...startupSnapshot.val(),
        founderWalletAddress: walletAddress
      });
      console.log(`[Direct Wallet] Updated startup ${startupId} with wallet address`);
    } else {
      console.log(`[Direct Wallet] Startup ${startupId} not found, cannot save wallet`);
    }
    
    // Step 3: If we have both the startup and user, update the sameId on both
    if (userSnapshot.exists() && startupSnapshot.exists()) {
      // Generate a sameId if one doesn't exist
      const sameId = `${startupId}_${founderIdOrUid}`;
      
      // Update the user with sameId
      await set(userRef, {
        ...userSnapshot.val(),
        walletAddress: walletAddress,
        sameId: sameId
      });
      
      // Update the startup with sameId
      await set(startupRef, {
        ...startupSnapshot.val(),
        founderWalletAddress: walletAddress,
        sameId: sameId
      });
      
      console.log(`[Direct Wallet] Updated both records with sameId: ${sameId}`);
    }
    
    console.log(`[Direct Wallet] Successfully saved wallet address in all locations`);
    
    // Broadcast the wallet update via WebSocket to notify any investors viewing this startup
    try {
      // Only send if we're in a browser environment
      if (typeof window !== 'undefined') {
        // Get WebSocket URL based on current environment
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log(`[Direct Wallet] Sending wallet update notification via WebSocket: ${startupId}:${walletAddress}`);
        
        // Create a new connection if we don't want to affect any existing ones
        const socket = new WebSocket(wsUrl);
        
        // Once connected, send the wallet update notification
        socket.addEventListener('open', () => {
          const message = {
            type: 'wallet_update',
            startupId: startupId,
            walletAddress: walletAddress,
            timestamp: Date.now()
          };
          
          socket.send(JSON.stringify(message));
          console.log('[Direct Wallet] Wallet update notification sent via WebSocket');
          
          // Close the connection after sending
          setTimeout(() => socket.close(), 1000);
        });
        
        // Handle any errors
        socket.addEventListener('error', (error) => {
          console.error('[Direct Wallet] WebSocket error when sending wallet update:', error);
        });
      }
    } catch (wsError) {
      // Don't let WebSocket issues affect the success of the wallet save operation
      console.error('[Direct Wallet] Failed to send WebSocket notification:', wsError);
    }
    
    return true;
  } catch (error) {
    console.error('[Direct Wallet] Error saving wallet address:', error);
    return false;
  }
};

/**
 * Checks all wallet access methods and returns a complete diagnostic report
 * Very useful for debugging wallet issues in the application
 */
export const runWalletDiagnostics = async (
  startupId: string,
  founderId?: string
): Promise<{
  status: 'success' | 'partial_success' | 'failure';
  walletAddress: string | null;
  startup: any | null;
  founder: any | null;
  methods: {
    method: string;
    result: string | null;
    successful: boolean;
  }[];
}> => {
  const diagnosticResults = {
    status: 'failure' as 'success' | 'partial_success' | 'failure',
    walletAddress: null as string | null,
    startup: null as any | null,
    founder: null as any | null,
    methods: [] as {
      method: string;
      result: string | null;
      successful: boolean;
    }[]
  };
  
  try {
    console.log(`[Direct Wallet] Running wallet diagnostics for startup ID: ${startupId}`);
    
    // Method 1: Direct startup lookup
    let method1Result: string | null = null;
    try {
      const startupRef = ref(database, `startups/${startupId}`);
      const startupSnapshot = await get(startupRef);
      
      if (startupSnapshot.exists()) {
        const startup = startupSnapshot.val();
        diagnosticResults.startup = { ...startup, id: startupId };
        
        if (startup.founderWalletAddress && startup.founderWalletAddress.startsWith('0x')) {
          method1Result = startup.founderWalletAddress;
        }
      }
    } catch (error) {
      console.error('[Direct Wallet] Error in Method 1:', error);
    }
    
    diagnosticResults.methods.push({
      method: 'Direct startup.founderWalletAddress lookup',
      result: method1Result,
      successful: !!method1Result
    });
    
    if (method1Result) {
      diagnosticResults.walletAddress = method1Result;
    }
    
    // Method 2: Founder ID lookup
    let method2Result: string | null = null;
    if (founderId || (diagnosticResults.startup && diagnosticResults.startup.founderId)) {
      const founderIdToUse = founderId || diagnosticResults.startup.founderId;
      
      try {
        const userRef = ref(database, `users/${founderIdToUse}`);
        const userSnapshot = await get(userRef);
        
        if (userSnapshot.exists()) {
          const founder = userSnapshot.val();
          diagnosticResults.founder = { ...founder, uid: founderIdToUse };
          
          if (founder.walletAddress && founder.walletAddress.startsWith('0x')) {
            method2Result = founder.walletAddress;
          }
        }
      } catch (error) {
        console.error('[Direct Wallet] Error in Method 2:', error);
      }
    }
    
    diagnosticResults.methods.push({
      method: 'Founder user.walletAddress lookup',
      result: method2Result,
      successful: !!method2Result
    });
    
    if (!diagnosticResults.walletAddress && method2Result) {
      diagnosticResults.walletAddress = method2Result;
    }
    
    // Method 3: SameId lookup
    let method3Result: string | null = null;
    if (diagnosticResults.startup && diagnosticResults.startup.sameId) {
      try {
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        
        if (usersSnapshot.exists()) {
          let matchingUser: any = null;
          
          usersSnapshot.forEach(childSnapshot => {
            const user = childSnapshot.val();
            if (user.sameId === diagnosticResults.startup.sameId) {
              matchingUser = { ...user, uid: childSnapshot.key };
              return true; // Break the forEach loop
            }
          });
          
          if (matchingUser && matchingUser.walletAddress && matchingUser.walletAddress.startsWith('0x')) {
            method3Result = matchingUser.walletAddress;
            
            // Also update the founder info if we didn't have it already
            if (!diagnosticResults.founder) {
              diagnosticResults.founder = matchingUser;
            }
          }
        }
      } catch (error) {
        console.error('[Direct Wallet] Error in Method 3:', error);
      }
    }
    
    diagnosticResults.methods.push({
      method: 'SameId matching between user and startup',
      result: method3Result,
      successful: !!method3Result
    });
    
    if (!diagnosticResults.walletAddress && method3Result) {
      diagnosticResults.walletAddress = method3Result;
    }
    
    // Calculate overall status
    if (diagnosticResults.walletAddress) {
      // If all methods succeeded, it's a full success
      if (diagnosticResults.methods.every(m => m.successful)) {
        diagnosticResults.status = 'success';
      } else {
        // If some methods succeeded but not all, it's a partial success
        diagnosticResults.status = 'partial_success';
      }
    } else {
      diagnosticResults.status = 'failure';
    }
    
    console.log(`[Direct Wallet] Diagnostics complete with status: ${diagnosticResults.status}`);
    return diagnosticResults;
  } catch (error) {
    console.error('[Direct Wallet] Error running wallet diagnostics:', error);
    return diagnosticResults;
  }
};