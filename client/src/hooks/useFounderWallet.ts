import { useState, useEffect } from 'react';
import { 
  getUserWallet, 
  getWalletByUserId,
  WalletData
} from '@/firebase/walletDatabase';
import { getUserByUid, getStartupById } from '@/firebase/database';
import { useStartups } from '@/hooks/useStartups';
import { getDatabase, ref, get, update } from 'firebase/database';
import { app } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';

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
      const timeoutId = setTimeout(() => {
        console.log("[useFounderWallet] Timeout reached while fetching wallet data");
        setIsLoading(false);
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
        
        setError("not_found");
      }, 5000); // 5 second timeout
      
      try {
        // Extract founderId from startup data
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
        
        // PRIORITY 1: Check if we have a direct wallet address in startup data (most reliable)
        const startupWithCustomFields = startupData as any;
        if (startupWithCustomFields.founderWalletAddress) {
          console.log("[useFounderWallet] Using wallet address from startup.founderWalletAddress:", 
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
        
        // PRIORITY 2: Check if there's a walletAddress field directly in the startup data
        if (startupWithCustomFields.walletAddress) {
          console.log("[useFounderWallet] Using wallet address from startup.walletAddress field:", 
            startupWithCustomFields.walletAddress);
          
          setFounderWallet(startupWithCustomFields.walletAddress);
          setFounderInfo({
            id: founderId,
            name: startupWithCustomFields.founderName || "Founder",
            walletAddress: startupWithCustomFields.walletAddress
          });
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }
        
        // PRIORITY 3: Try multiple methods to find the wallet address IN PARALLEL
        console.log("[useFounderWallet] Fetching wallet using multiple sources for ID:", founderId);
        
        // Use the enhanced wallet lookup system
        const walletByUserIdPromise = getWalletByUserId(founderId.toString())
          .catch((err: Error) => {
            console.error("[useFounderWallet] Error fetching with getWalletByUserId:", err);
            return null;
          });
          
        // Also try the numeric format as a fallback
        const walletDbPromise = getUserWallet(parseInt(founderId.toString()) || 999)
          .catch((err: Error) => {
            console.error("[useFounderWallet] Error fetching from wallet DB:", err);
            return null;
          });
          
        // And try the user profile as a third method
        const userProfilePromise = getUserByUid(founderId.toString())
          .catch((err: Error) => {
            console.error("[useFounderWallet] Error fetching from user profile:", err);
            return null;
          });
          
        // Wait for all three methods to complete
        const [walletByUserId, walletData, userData] = await Promise.all([
          walletByUserIdPromise, 
          walletDbPromise, 
          userProfilePromise
        ]);
        
        // First try the new enhanced lookup method
        if (walletByUserId && walletByUserId.address) {
          console.log("[useFounderWallet] Found wallet using getWalletByUserId:", walletByUserId.address);
          setFounderWallet(walletByUserId.address);
          setFounderInfo({
            id: founderId,
            name: walletByUserId.username || "Founder",
            walletAddress: walletByUserId.address
          });
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }
        
        // Next try the legacy wallet database result
        if (walletData && walletData.address) {
          console.log("[useFounderWallet] Found wallet address in wallet database:", walletData.address);
          setFounderWallet(walletData.address);
          setFounderInfo({
            id: founderId,
            name: walletData.username || "Founder",
            walletAddress: walletData.address
          });
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }
        
        // Finally try the user profile result
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
        
        // PRIORITY 4: Last resort - check startup via Firebase Realtime Database
        try {
          if (startupId) {
            console.log("[useFounderWallet] Trying to fetch from Firebase Realtime DB for startup:", startupId);
            
            // Get startup by ID from database
            const database = getDatabase(app);
            const startupRef = ref(database, `startups/${startupId.toString()}`);
            const startupSnapshot = await get(startupRef);
            
            if (startupSnapshot.exists()) {
              const firebaseStartupData = startupSnapshot.val();
              console.log("[useFounderWallet] Found startup in Firebase:", firebaseStartupData);
              
              if (firebaseStartupData.founderWalletAddress) {
                console.log("[useFounderWallet] Found wallet in Firebase startup data:", 
                  firebaseStartupData.founderWalletAddress);
                
                setFounderWallet(firebaseStartupData.founderWalletAddress);
                setFounderInfo({
                  id: founderId,
                  name: firebaseStartupData.founderName || "Founder",
                  walletAddress: firebaseStartupData.founderWalletAddress
                });
                setIsLoading(false);
                clearTimeout(timeoutId);
                return;
              }
            }
          }
        } catch (firebaseError) {
          console.error("[useFounderWallet] Error fetching from Firebase:", firebaseError);
          // Continue with flow - this is just a fallback
        }
        
        // NO LONGER CHECKING SAMPLE WALLETS
        // Using only real wallet addresses provided by founders during signup
        console.log("[useFounderWallet] Not checking sample wallets - using only real founder wallets");
        
        // NO LONGER USING FALLBACK WALLET
        // We will require founders to connect their real wallets during signup
        
        // If all methods fail, return error
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
        
        setError("not_found");
        
      } catch (err) {
        console.error("[useFounderWallet] Error looking up wallet:", err);
        setError("error");
        setFounderInfo(null);
        setFounderWallet(null);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    
    // Start the wallet lookup process
    loadFounderWallet();
    
    // Return cleanup function
    return () => {
      console.log("[useFounderWallet] Cleaning up effect");
    };
  }, [startupData, isStartupLoading, startupId]);
  
  return {
    founderWallet,
    founderInfo,
    isLoading: isLoading || isStartupLoading,
    error,
    hasWallet: !!founderWallet || (founderInfo?.walletAddress && founderInfo.walletAddress !== "")
  };
};