import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  saveWalletAddress, 
  getWalletByUserId, 
  updateWalletAddress, 
  deleteWallet,
  getWalletFromFallback,
  saveWalletToFallback,
  WalletData
} from '@/firebase/walletDatabase';

export const useWallet = (userId?: string | null) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use either provided userId or the authenticated user's ID
  const targetUserId = userId || (user ? user.uid : null);
  
  // Load wallet data on component mount or when userId changes
  useEffect(() => {
    const loadWalletData = async () => {
      if (!targetUserId) {
        setIsLoading(false);
        setWalletData(null);
        setWalletAddress(null);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to get wallet from the database
        const wallet = await getWalletByUserId(targetUserId);
        
        if (wallet) {
          console.log(`[useWallet] Found wallet for user ${targetUserId}:`, wallet);
          setWalletData(wallet);
          setWalletAddress(wallet.address);
          
          // Store in fallback for redundancy
          saveWalletToFallback(targetUserId, wallet);
        } else {
          // Check fallback storage if database fails
          console.log(`[useWallet] No wallet found in database for ${targetUserId}, checking fallback`);
          const fallbackWallet = getWalletFromFallback(targetUserId);
          
          if (fallbackWallet) {
            console.log(`[useWallet] Using fallback wallet data for ${targetUserId}`);
            setWalletData(fallbackWallet);
            setWalletAddress(fallbackWallet.address);
          } else {
            setWalletData(null);
            setWalletAddress(null);
          }
        }
      } catch (err) {
        console.error('[useWallet] Error loading wallet:', err);
        setError('Failed to load wallet data');
        
        // Try fallback as a last resort
        const fallbackWallet = getWalletFromFallback(targetUserId);
        if (fallbackWallet) {
          setWalletData(fallbackWallet);
          setWalletAddress(fallbackWallet.address);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWalletData();
  }, [targetUserId]);
  
  // Connect a new wallet address
  const connectWallet = useCallback(async (address: string) => {
    if (!targetUserId) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to connect your wallet',
        variant: 'destructive',
      });
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Save wallet address to the database
      await saveWalletAddress(
        targetUserId,
        address,
        user?.displayName || undefined,
        user?.role || undefined
      );
      
      // Update local state
      const newWalletData: WalletData = {
        address,
        userId: targetUserId,
        userName: user?.displayName,
        role: user?.role,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      setWalletData(newWalletData);
      setWalletAddress(address);
      
      // Store in fallback for redundancy
      saveWalletToFallback(targetUserId, newWalletData);
      
      toast({
        title: 'Wallet Connected',
        description: `Wallet ${address.substring(0, 6)}...${address.substring(address.length - 4)} connected successfully`,
      });
      
      return true;
    } catch (err) {
      console.error('[useWallet] Error connecting wallet:', err);
      setError('Failed to connect wallet');
      
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect your wallet. Please try again.',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, user, toast]);
  
  // Update an existing wallet address
  const updateWallet = useCallback(async (address: string) => {
    if (!targetUserId) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to update your wallet',
        variant: 'destructive',
      });
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Update wallet address in the database
      await updateWalletAddress(targetUserId, address);
      
      // Update local state
      setWalletData(prev => prev ? {
        ...prev,
        address,
        updatedAt: Date.now()
      } : {
        address,
        userId: targetUserId,
        userName: user?.displayName,
        role: user?.role,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      setWalletAddress(address);
      
      // Update fallback storage
      const updatedWallet = {
        address,
        userId: targetUserId,
        userName: user?.displayName,
        role: user?.role,
        createdAt: walletData?.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      saveWalletToFallback(targetUserId, updatedWallet);
      
      toast({
        title: 'Wallet Updated',
        description: `Wallet address updated successfully`,
      });
      
      return true;
    } catch (err) {
      console.error('[useWallet] Error updating wallet:', err);
      setError('Failed to update wallet');
      
      toast({
        title: 'Update Failed',
        description: 'Failed to update your wallet. Please try again.',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, user, toast, walletData]);
  
  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    if (!targetUserId) {
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Delete wallet from the database
      await deleteWallet(targetUserId);
      
      // Clear local state
      setWalletData(null);
      setWalletAddress(null);
      
      toast({
        title: 'Wallet Disconnected',
        description: 'Your wallet has been disconnected',
      });
      
      return true;
    } catch (err) {
      console.error('[useWallet] Error disconnecting wallet:', err);
      setError('Failed to disconnect wallet');
      
      // Even if DB fails, still clear local state
      setWalletData(null);
      setWalletAddress(null);
      
      toast({
        title: 'Disconnection Issue',
        description: 'There was an issue with the database, but your wallet has been disconnected locally',
        variant: 'destructive',
      });
      
      return true; // Return true anyway since locally it's disconnected
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, toast]);
  
  return {
    walletData,
    walletAddress,
    isLoading,
    error,
    connectWallet,
    updateWallet,
    disconnectWallet,
    hasWallet: !!walletAddress
  };
};