/**
 * Enhanced function to retrieve a startup's wallet address 
 * with ONLY direct Firestore lookup - NO FALLBACKS
 */
// Use relative imports with the correct path
import { apiRequest } from '../lib/queryClient';
import { normalizeWalletAddress } from '../lib/utils';

// Cache for wallet addresses to avoid repeated API calls
const walletCache: Record<string, { address: string; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get a startup's wallet address ONLY from Firestore
 * No fallbacks or temporary addresses allowed
 * Uses ONLY the following methods:
 * 1. Cached wallet address (if recent)
 * 2. API endpoint for wallet address (/api/wallets/startup/:id) - direct Firestore query
 * 3. Get startup details and founder's wallet from Firestore
 * 
 * @param startupId The ID of the startup
 * @returns Promise resolving to wallet address or null
 */
export async function getStartupWalletNew(startupId: string | number): Promise<string | null> {
  const startupIdStr = startupId.toString();
  console.log(`[getStartupWalletNew] Fetching wallet for startup ${startupIdStr} (Firestore-only mode)`);
  
  // Check cache first
  const now = Date.now();
  const cachedWallet = walletCache[startupIdStr];
  
  if (cachedWallet && (now - cachedWallet.timestamp < CACHE_TTL)) {
    console.log(`[getStartupWalletNew] Using cached wallet for startup ${startupIdStr}: ${cachedWallet.address}`);
    return cachedWallet.address;
  }
  
  try {
    // APPROACH 1: Try getting from the wallet API endpoint (direct Firestore query)
    console.log(`[getStartupWalletNew] Fetching wallet from Firestore via API for startup ${startupIdStr}`);
    const walletResponse = await apiRequest(`/api/wallets/startup/${startupIdStr}`);
    
    if (walletResponse && walletResponse.walletAddress) {
      const walletAddress = normalizeWalletAddress(walletResponse.walletAddress);
      console.log(`[getStartupWalletNew] ✅ Found real wallet in Firestore: ${walletAddress}`);
      
      // Cache the result
      walletCache[startupIdStr] = { address: walletAddress, timestamp: now };
      return walletAddress;
    }
    
    // APPROACH 2: Get the startup details and founder ID from Firestore
    console.log(`[getStartupWalletNew] Fetching startup details from Firestore for ${startupIdStr}`);
    const startupResponse = await apiRequest(`/api/startups/${startupIdStr}`);
    
    if (startupResponse && startupResponse.founderId) {
      const founderId = startupResponse.founderId;
      console.log(`[getStartupWalletNew] Found founderId in Firestore: ${founderId}, getting founder wallet`);
      
      // Get the founder's wallet address directly from Firestore
      const founderWalletResponse = await apiRequest(`/api/wallets/user/${founderId}`);
      
      if (founderWalletResponse && founderWalletResponse.walletAddress) {
        const founderWalletAddress = normalizeWalletAddress(founderWalletResponse.walletAddress);
        console.log(`[getStartupWalletNew] ✅ Found founder's real wallet in Firestore: ${founderWalletAddress}`);
        
        // Cache the result
        walletCache[startupIdStr] = { address: founderWalletAddress, timestamp: now };
        return founderWalletAddress;
      }
    }
    
    // NO FALLBACKS - if we couldn't find a real wallet in Firestore, return null
    console.log(`[getStartupWalletNew] ❌ No real wallet found in Firestore for startup ${startupIdStr}`);
    return null;
  } catch (error) {
    console.error(`[getStartupWalletNew] Error fetching wallet from Firestore for startup ${startupIdStr}:`, error);
    return null;
  }
}