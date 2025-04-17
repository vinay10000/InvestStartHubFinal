import { useState, useEffect } from 'react';
import { getWalletByUserId } from '@/firebase/walletDatabase';
import { getUserByUid } from '@/firebase/database';
import { useStartups } from '@/hooks/useStartups';

/**
 * Hook to get a founder's wallet address for a specific startup
 */
export const useFounderWallet = (startupId: string | number | null) => {
  const [founderWallet, setFounderWallet] = useState<string | null>(null);
  const [founderInfo, setFounderInfo] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // First get the startup details to find the founder ID
  const { useStartup } = useStartups();
  const { data: startupData, isLoading: isStartupLoading } = useStartup(
    startupId ? startupId.toString() : ""
  );
  
  // Once we have the startup, fetch the founder's wallet
  useEffect(() => {
    const loadFounderWallet = async () => {
      if (isStartupLoading || !startupData) {
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      // Set a shorter timeout to prevent excessive waiting
      // Reduced from 8 seconds to 5 seconds to avoid MetaMask waiting too long
      const timeoutId = setTimeout(() => {
        console.log("[useFounderWallet] Timeout reached while fetching wallet data");
        setIsLoading(false);
        // Instead of error, force continue with manual entry
        setFounderWallet(null);
        setError("not_found");
      }, 5000); // 5 second timeout
      
      try {
        // Extract founderId, supporting various possible formats
        const founderId = startupData.founderId || 
                         (startupData as any).founder_id || 
                         (startupData as any).founderid ||
                         (startupData as any).founderId;
        
        if (!founderId) {
          console.error("[useFounderWallet] Startup data missing founderId:", startupData);
          setError("not_found");
          setIsLoading(false);
          return;
        }
        
        console.log("[useFounderWallet] Starting wallet lookup for founder ID:", founderId);
        
        // First check if we have a direct wallet address in startup data
        const startupWithCustomFields = startupData as any;
        if (startupWithCustomFields.founderWalletAddress) {
          console.log("[useFounderWallet] Using wallet address from startup data:", 
            startupWithCustomFields.founderWalletAddress);
          
          setFounderWallet(startupWithCustomFields.founderWalletAddress);
          setFounderInfo({
            id: founderId,
            name: startupWithCustomFields.founderName || "Founder",
            walletAddress: startupWithCustomFields.founderWalletAddress
          });
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }
        
        // Try multiple methods to find the wallet address IN PARALLEL
        console.log("[useFounderWallet] Fetching wallet using multiple sources for ID:", founderId);
        
        // Create promises for both lookup methods
        const walletDbPromise = getWalletByUserId(founderId.toString())
          .catch(err => {
            console.error("[useFounderWallet] Error fetching from wallet DB:", err);
            return null;
          });
          
        const userProfilePromise = getUserByUid(founderId.toString())
          .catch(err => {
            console.error("[useFounderWallet] Error fetching from user profile:", err);
            return null;
          });
          
        // Wait for both to complete
        const [walletData, userData] = await Promise.all([walletDbPromise, userProfilePromise]);
        
        // Check wallet database result
        if (walletData && walletData.address) {
          console.log("[useFounderWallet] Found wallet address in wallet database:", walletData.address);
          setFounderWallet(walletData.address);
          setFounderInfo({
            id: founderId,
            name: walletData.userName || "Founder",
            walletAddress: walletData.address
          });
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }
        
        // Check user profile result
        if (userData && userData.walletAddress) {
          console.log("[useFounderWallet] Found wallet address in user profile:", userData.walletAddress);
          setFounderWallet(userData.walletAddress);
          setFounderInfo({
            id: founderId,
            name: userData.username || "Founder",
            walletAddress: userData.walletAddress
          });
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }
        
        // If all methods fail, return error
        console.warn("[useFounderWallet] No wallet found for founder after multiple attempts:", founderId);
        setFounderWallet(null);
        
        // If we have basic founder info in the startup data or user data, still return it
        if (startupWithCustomFields.founderName || userData?.username) {
          setFounderInfo({
            id: founderId,
            name: startupWithCustomFields.founderName || userData?.username || "Founder",
            walletAddress: null
          });
        } else {
          setFounderInfo(null);
        }
        
        // Set error as "not_found" for consistent handling by UI
        setError("not_found");
        
      } catch (err) {
        console.error("[useFounderWallet] Error looking up wallet:", err);
        setError("error");
        setFounderInfo(null);
        setFounderWallet(null);
      } finally {
        // Clear the timeout in finally block to ensure it's always cleared
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    
    // Start the wallet lookup process
    loadFounderWallet();
    
    // Return cleanup function to clear timeout if component unmounts
    return () => {
      console.log("[useFounderWallet] Cleaning up effect");
    };
  }, [startupData, isStartupLoading]);
  
  return {
    founderWallet,
    founderInfo,
    isLoading: isLoading || isStartupLoading,
    error,
    hasWallet: !!founderWallet
  };
};