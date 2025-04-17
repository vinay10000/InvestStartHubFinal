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
      
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log("[useFounderWallet] Timeout reached while fetching wallet data");
        setIsLoading(false);
        setError("Timeout while loading wallet data");
      }, 8000); // 8 second timeout
      
      try {
        const founderId = startupData.founderId;
        
        if (!founderId) {
          console.error("[useFounderWallet] Startup data missing founderId:", startupData);
          setError("Could not find the founder for this startup");
          setIsLoading(false);
          return;
        }
        
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
          return;
        }
        
        // Try multiple methods to find the wallet address
        console.log("[useFounderWallet] Fetching wallet for founder ID:", founderId);
        
        // First try the wallet database using the ID directly
        const walletData = await getWalletByUserId(founderId.toString());
        
        if (walletData && walletData.address) {
          console.log("[useFounderWallet] Found wallet address in wallet database:", walletData.address);
          setFounderWallet(walletData.address);
          setFounderInfo({
            id: founderId,
            name: walletData.userName || "Founder",
            walletAddress: walletData.address
          });
          setIsLoading(false);
          return;
        }
        
        // If not found in wallet database, try user profile in Firebase
        console.log("[useFounderWallet] Checking user profile in Firebase database");
        const userData = await getUserByUid(founderId.toString());
        
        if (userData && userData.walletAddress) {
          console.log("[useFounderWallet] Found wallet address in user profile:", userData.walletAddress);
          setFounderWallet(userData.walletAddress);
          setFounderInfo({
            id: founderId,
            name: userData.username || "Founder",
            walletAddress: userData.walletAddress
          });
          setIsLoading(false);
          return;
        }
        
        // If all methods fail, return error
        console.warn("[useFounderWallet] No wallet found for founder after multiple attempts:", founderId);
        setFounderWallet(null);
        
        // If we have basic founder info in the startup data, still return it
        if (startupWithCustomFields.founderName || userData?.username) {
          setFounderInfo({
            id: founderId,
            name: startupWithCustomFields.founderName || userData?.username || "Founder",
            walletAddress: null
          });
        } else {
          setFounderInfo(null);
        }
        
        setError("Founder has not connected a wallet address");
        
      } catch (err) {
        console.error("[useFounderWallet] Error:", err);
        setError("Failed to load founder information");
        setFounderInfo(null);
        setFounderWallet(null);
      } finally {
        // Clear the timeout in finally block to ensure it's always cleared
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    
    loadFounderWallet();
    
    // Return cleanup function to clear timeout if component unmounts
    return () => {
      // Any active timeouts should be cleared when unmounting
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