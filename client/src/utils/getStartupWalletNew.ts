/**
 * Enhanced function to retrieve a startup's wallet address
 * with multiple fallback approaches and improved reliability
 */
// Use relative imports with the correct path
import { apiRequest } from '../lib/queryClient';
import { normalizeWalletAddress } from '../lib/utils';
import { getStartupWallet } from './wallet-utils';

// Cache for wallet addresses to avoid repeated API calls
const walletCache: Record<string, { address: string; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get a startup's wallet address with enhanced reliability
 * Uses the following fallback mechanisms:
 * 1. Cached wallet address (if recent)
 * 2. API endpoint for wallet address (/api/wallets/startup/:id)
 * 3. Fetch startup details and get founderId
 * 4. Use founder's wallet address as fallback (/api/wallets/user/:founderId)
 * 
 * @param startupId The ID of the startup
 * @returns Promise resolving to wallet address or null
 */
export async function getStartupWalletNew(startupId: string | number): Promise<string | null> {
  const startupIdStr = startupId.toString();
  console.log(`[getStartupWalletNew] Fetching wallet for startup ${startupIdStr}`);
  
  // Check cache first
  const now = Date.now();
  const cachedWallet = walletCache[startupIdStr];
  
  if (cachedWallet && (now - cachedWallet.timestamp < CACHE_TTL)) {
    console.log(`[getStartupWalletNew] Using cached wallet for startup ${startupIdStr}: ${cachedWallet.address}`);
    return cachedWallet.address;
  }
  
  try {
    // Approach 1: Try getting from the wallet API endpoint
    console.log(`[getStartupWalletNew] Trying API endpoint for startup ${startupIdStr}`);
    const walletResponse = await apiRequest(`/api/wallets/startup/${startupIdStr}`);
    
    if (walletResponse && walletResponse.walletAddress) {
      const walletAddress = normalizeWalletAddress(walletResponse.walletAddress);
      console.log(`[getStartupWalletNew] Found via API: ${walletAddress}`);
      
      // Cache the result
      walletCache[startupIdStr] = { address: walletAddress, timestamp: now };
      return walletAddress;
    }
    
    // Approach 2: Get the startup details to find the founder
    console.log(`[getStartupWalletNew] Trying to get startup details for ${startupIdStr}`);
    const startupResponse = await apiRequest(`/api/startups/${startupIdStr}`);
    
    if (startupResponse && startupResponse.founderId) {
      const founderId = startupResponse.founderId;
      console.log(`[getStartupWalletNew] Found founderId: ${founderId}, getting founder wallet`);
      
      // Approach 3: Get the founder's wallet address directly
      // This is the most reliable method as shown in the diagnostics
      const founderWalletResponse = await apiRequest(`/api/wallets/user/${founderId}`);
      
      if (founderWalletResponse && founderWalletResponse.walletAddress) {
        const founderWalletAddress = normalizeWalletAddress(founderWalletResponse.walletAddress);
        console.log(`[getStartupWalletNew] Found via founder: ${founderWalletAddress}`);
        
        // Cache the result
        walletCache[startupIdStr] = { address: founderWalletAddress, timestamp: now };
        return founderWalletAddress;
      }
    }
    
    // Approach 4: Fallback to the utility function if all else fails
    console.log(`[getStartupWalletNew] Trying utility function fallback`);
    const fallbackWallet = await getStartupWallet(startupIdStr);
    
    if (fallbackWallet) {
      const normalizedWallet = normalizeWalletAddress(fallbackWallet);
      console.log(`[getStartupWalletNew] Found via fallback: ${normalizedWallet}`);
      
      // Cache the result
      walletCache[startupIdStr] = { address: normalizedWallet, timestamp: now };
      return normalizedWallet;
    }
    
    console.log(`[getStartupWalletNew] No wallet found for startup ${startupIdStr}`);
    return null;
  } catch (error) {
    console.error(`[getStartupWalletNew] Error fetching wallet for startup ${startupIdStr}:`, error);
    
    try {
      // One last attempt using the utility function
      const emergencyFallbackWallet = await getStartupWallet(startupIdStr);
      if (emergencyFallbackWallet) {
        const normalizedEmergencyWallet = normalizeWalletAddress(emergencyFallbackWallet);
        console.log(`[getStartupWalletNew] Found via emergency fallback: ${normalizedEmergencyWallet}`);
        return normalizedEmergencyWallet;
      }
    } catch (fallbackError) {
      console.error(`[getStartupWalletNew] Fallback also failed:`, fallbackError);
    }
    
    return null;
  }
}