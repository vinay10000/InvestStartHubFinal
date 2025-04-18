import { useState, useEffect } from 'react';
import { 
  getUserWallet,
  addWalletAddress,
  removeWalletAddress
} from '@/firebase/walletDatabase';
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
      
      // For debug - log what startup ID we're using
      console.log("[useFounderWallet] Looking up wallet for startup:", startupData);
      
      // Set a timeout to prevent excessive waiting
      // Shorter timeout for better UX, but still allowing Firebase to respond
      const timeoutId = setTimeout(() => {
        console.log("[useFounderWallet] Timeout reached while fetching wallet data");
        setIsLoading(false);
        
        // Since we're relying on real data only, report not found after timeout
        setFounderWallet(null);
        
        // Set basic founder info if available
        if (startupData) {
          setFounderInfo({
            id: startupData.id || startupId || '',
            name: startupData.name || "Founder",
            walletAddress: null
          });
        } else {
          setFounderInfo(null);
        }
        
        // Set error as "not_found" for consistent handling by UI
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
        
        // Check for immediate in-memory wallet data for quick response
        const cachedWalletAddress = getLastSavedWalletAddress(founderId.toString());
        if (cachedWalletAddress) {
          console.log("[useFounderWallet] Found wallet in synchronous memory cache:", cachedWalletAddress);
          
          setFounderWallet(cachedWalletAddress);
          setFounderInfo({
            id: founderId,
            name: "Founder",
            walletAddress: cachedWalletAddress
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
        
        // If all methods fail, try one more approach - check for numeric wallet entry
        console.warn("[useFounderWallet] No wallet found for founder after primary methods, trying numeric ID check:", founderId);
        
        // Check if there's a wallet with a numeric ID that we can migrate
        // Common IDs to check would be "1", "2", "92" etc. based on your JSON data
        const commonNumericIds = ["1", "2", "92", "3", "4", "5", "10"];
        
        let migratedWallet = null;
        // Try to migrate a wallet from any of these numeric IDs to the Firebase UID
        for (const numericId of commonNumericIds) {
          const numericWallet = await getWalletByUserId(numericId);
          if (numericWallet && numericWallet.address) {
            console.log(`[useFounderWallet] Found wallet with numeric ID ${numericId}, attempting migration to Firebase UID ${founderId}`);
            
            // Migrate the wallet to use the Firebase UID
            const migrationResult = await migrateWalletToFirebaseUid(
              numericId,
              founderId.toString(),
              numericWallet.address
            );
            
            if (migrationResult) {
              console.log(`[useFounderWallet] Successfully migrated wallet from numeric ID ${numericId} to Firebase UID ${founderId}`);
              // Set the wallet info
              migratedWallet = numericWallet.address;
              break;
            }
          }
        }
        
        // If we were able to migrate a wallet, use it
        if (migratedWallet) {
          console.log("[useFounderWallet] Using migrated wallet:", migratedWallet);
          setFounderWallet(migratedWallet);
          setFounderInfo({
            id: founderId,
            name: userData?.username || startupWithCustomFields.founderName || "Founder",
            walletAddress: migratedWallet
          });
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }
        
        // If all methods fail including migration, return error
        console.warn("[useFounderWallet] No wallet found for founder after all attempts:", founderId);
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