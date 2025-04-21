import { useState, useEffect } from 'react';

interface UseFounderWalletResult {
  walletAddress: string | null;
  founderWallet: string | null; // Added for compatibility
  founderInfo: any; // Added for compatibility
  hasWallet: boolean; // Added for compatibility
  isLoading: boolean;
  error: string | null; // Changed to string | null
  refetch: () => Promise<string | null>;
  diagnosticResults?: any; // Added to provide detailed diagnostics
}

/**
 * Custom hook to retrieve a founder's wallet address from MongoDB
 * Uses multiple methods to find the wallet, with a priority order for reliability
 * 
 * @param startupIdOrFounderId - Can be either a startup ID or founder ID
 * @returns Object containing the wallet address, loading state, error state, and refetch function
 */
export function useFounderWallet(startupIdOrFounderId?: string | number | null): UseFounderWalletResult {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!startupIdOrFounderId);
  const [error, setError] = useState<string | null>(null);
  const [founderInfo, setFounderInfo] = useState<any>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);

  const fetchWalletAddress = async (id: string): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Normalize the ID - handle both number and string IDs
      const normalizedId = id.toString().trim();
      
      console.log(`[useFounderWallet] Fetching wallet for ID: ${normalizedId} (type: ${typeof id})`);
      
      // Check if we have a previously cached result in session storage
      try {
        const cachedWallet = sessionStorage.getItem(`founder_wallet_${normalizedId}`);
        if (cachedWallet && cachedWallet.startsWith('0x')) {
          console.log(`[useFounderWallet] Found cached wallet:`, cachedWallet);
          // Still run the full lookup in the background to ensure data is fresh
          // But return immediately for better UX
          setWalletAddress(cachedWallet);
          setFounderInfo({
            id: normalizedId,
            walletAddress: cachedWallet,
            name: "Founder (Cached)"
          });
        }
      } catch (e) {
        console.warn('[useFounderWallet] Error checking session storage:', e);
      }
      
      // Try multiple ID formats to increase chances of finding the wallet
      const idVariations = [
        normalizedId, // original ID
        normalizedId.toLowerCase(), // lowercase version
        isNaN(Number(normalizedId)) ? normalizedId : Number(normalizedId).toString(), // numeric if applicable
      ];
      
      console.log(`[useFounderWallet] Will try these ID variations:`, idVariations);
      
      // Try each ID variation
      let address: string | null = null;
      let foundWithMethod = '';
      let diagnosticInfo: any = {};
      
      for (const idVariation of idVariations) {
        if (address) break; // Stop if we already found an address
        
        // Try direct wallet lookup by startup ID first
        console.log(`[useFounderWallet] Trying startup wallet lookup with ID: ${idVariation}...`);
        
        try {
          const response = await fetch(`/api/wallets/startup/${idVariation}`);
          
          if (response.ok) {
            const data = await response.json();
            address = data.walletAddress;
            
            if (address) {
              console.log(`[useFounderWallet] Startup lookup successful with ID ${idVariation}:`, address);
              foundWithMethod = 'startup-api';
              diagnosticInfo.startupWallet = { id: idVariation, result: address };
              break;
            }
          } else {
            console.log(`[useFounderWallet] Startup lookup failed for ${idVariation} with status: ${response.status}`);
            diagnosticInfo.startupWallet = { id: idVariation, error: `Status ${response.status}` };
          }
        } catch (err) {
          console.error(`[useFounderWallet] Error in startup lookup for ${idVariation}:`, err);
          diagnosticInfo.startupWallet = { id: idVariation, error: err instanceof Error ? err.message : String(err) };
        }
        
        // Try user wallet lookup
        console.log(`[useFounderWallet] Startup lookup failed for ${idVariation}, trying user lookup...`);
        
        try {
          const response = await fetch(`/api/wallets/user/${idVariation}`);
          
          if (response.ok) {
            const data = await response.json();
            address = data.walletAddress;
            
            if (address) {
              console.log(`[useFounderWallet] User lookup successful with ID ${idVariation}:`, address);
              foundWithMethod = 'user-api';
              diagnosticInfo.userWallet = { id: idVariation, result: address };
              break;
            }
          } else {
            console.log(`[useFounderWallet] User lookup failed for ${idVariation} with status: ${response.status}`);
            diagnosticInfo.userWallet = { id: idVariation, error: `Status ${response.status}` };
          }
        } catch (err) {
          console.error(`[useFounderWallet] Error in user lookup for ${idVariation}:`, err);
          diagnosticInfo.userWallet = { id: idVariation, error: err instanceof Error ? err.message : String(err) };
        }
      }
      
      // Set diagnostics results
      setDiagnosticResults({
        queriedId: normalizedId,
        idVariations,
        methodsAttempted: ['startup-api', 'user-api'],
        foundWithMethod,
        walletAddress: address,
        diagnosticInfo
      });
      
      // Set the results
      console.log(`[useFounderWallet] Final wallet lookup result:`, address, `(found with ${foundWithMethod})`);
      
      if (address) {
        setWalletAddress(address);
        setFounderInfo({
          id: normalizedId,
          walletAddress: address,
          name: `Founder (${foundWithMethod})`
        });
        
        // Cache this result for future use
        try {
          sessionStorage.setItem(`founder_wallet_${normalizedId}`, address);
        } catch (e) {
          console.warn('[useFounderWallet] Error saving to session storage:', e);
        }
        
        return address;
      }
      
      // No wallet found
      setError('not_found');
      return null;
    } catch (err) {
      console.error(`[useFounderWallet] Error fetching wallet:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet address');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount or when startupIdOrFounderId changes
  useEffect(() => {
    if (startupIdOrFounderId) {
      fetchWalletAddress(startupIdOrFounderId.toString());
    } else {
      // Reset state if no ID provided
      setWalletAddress(null);
      setFounderInfo(null);
      setIsLoading(false);
      setError(null);
    }
  }, [startupIdOrFounderId]);

  // Return the refetch function along with the state
  const refetch = async (): Promise<string | null> => {
    if (!startupIdOrFounderId) {
      console.warn('[useFounderWallet] Cannot refetch: No ID provided');
      return null;
    }
    return fetchWalletAddress(startupIdOrFounderId.toString());
  };

  // Calculate hasWallet for compatibility with the original interface
  const hasWallet = !!walletAddress;

  return { 
    walletAddress, 
    founderWallet: walletAddress, // Added for compatibility
    founderInfo,  // Added for compatibility
    hasWallet,    // Added for compatibility
    isLoading, 
    error, 
    refetch,
    diagnosticResults  // Include diagnostic results
  };
}

export default useFounderWallet;