import { useState, useEffect } from 'react';
import { getFounderWalletAddress, getFounderWalletBySameId } from '@/firebase/walletDatabase';
// Import our new direct wallet access functions for better wallet resolution
import { getWalletAddressByStartupId, runWalletDiagnostics } from '@/firebase/directWalletAccess';

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
 * Custom hook to retrieve a founder's wallet address from Firebase
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
      
      for (const idVariation of idVariations) {
        if (address) break; // Stop if we already found an address
        
        // Try our new comprehensive wallet lookup first
        console.log(`[useFounderWallet] Trying direct wallet access with ID: ${idVariation}...`);
        address = await getWalletAddressByStartupId(idVariation);
        
        // If direct lookup succeeds, use that result
        if (address) {
          console.log(`[useFounderWallet] Direct wallet access successful with ID ${idVariation}:`, address);
          foundWithMethod = 'direct';
          break;
        }
        
        // Try alternative methods
        console.log(`[useFounderWallet] Direct access failed for ${idVariation}, trying sameId lookup...`);
        address = await getFounderWalletBySameId(idVariation);
        
        if (address) {
          console.log(`[useFounderWallet] Found wallet through sameId lookup with ID ${idVariation}:`, address);
          foundWithMethod = 'sameId';
          break;
        }
        
        // Try direct founder lookup
        console.log(`[useFounderWallet] SameId lookup failed for ${idVariation}, trying direct founder lookup...`);
        address = await getFounderWalletAddress(idVariation);
        
        if (address) {
          console.log(`[useFounderWallet] Found wallet with direct founder lookup with ID ${idVariation}:`, address);
          foundWithMethod = 'founderLookup';
          break;
        }
      }
      
      // Run diagnostics regardless of the result
      console.log(`[useFounderWallet] Running diagnostics for ID: ${normalizedId}`);
      runWalletDiagnostics(normalizedId).then(results => {
        setDiagnosticResults(results);
        console.log(`[useFounderWallet] Wallet diagnostics completed:`, results);
        
        // If diagnostics found a wallet and our lookup didn't, use the diagnostics result
        if (results?.walletAddress && !address) {
          console.log(`[useFounderWallet] Using wallet from diagnostics:`, results.walletAddress);
          setWalletAddress(results.walletAddress);
          setFounderInfo({
            id: normalizedId,
            walletAddress: results.walletAddress,
            name: "Founder (Diagnostic Recovery)"
          });
          
          // Cache this result for future use
          try {
            sessionStorage.setItem(`founder_wallet_${normalizedId}`, results.walletAddress);
          } catch (e) {
            console.warn('[useFounderWallet] Error saving to session storage:', e);
          }
        }
      }).catch(err => {
        console.error(`[useFounderWallet] Diagnostics error:`, err);
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