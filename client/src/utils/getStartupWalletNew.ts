/**
 * Enhanced function to get a startup's wallet address
 * This function uses the reliable API endpoint that leverages multiple fallback methods
 */
export async function getStartupWalletNew(startupId: number | string): Promise<string | null> {
  try {
    console.log(`[getStartupWalletNew] Fetching wallet for startup ${startupId}`);
    
    // Call our API endpoint for startup wallet addresses
    // This endpoint uses multiple fallback mechanisms on the server side
    const response = await fetch(`/api/wallets/startup/${startupId}`);
    
    // Handle error responses
    if (!response.ok) {
      console.error(`[getStartupWalletNew] API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    const walletAddress = data?.walletAddress;
    
    if (walletAddress) {
      console.log(`[getStartupWalletNew] Found wallet for startup ${startupId}: ${walletAddress.substring(0, 10)}...`);
      return walletAddress;
    } else {
      console.log(`[getStartupWalletNew] No wallet found for startup ${startupId}`);
      return null;
    }
  } catch (error) {
    console.error(`[getStartupWalletNew] Error fetching wallet for startup ${startupId}:`, error);
    return null;
  }
}