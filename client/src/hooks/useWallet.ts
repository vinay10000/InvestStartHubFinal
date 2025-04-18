import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  addWalletAddress, 
  getUserWallet, 
  removeWalletAddress, 
  makeWalletPermanent,
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
  
  // For safer number parsing that works with both numeric and string IDs
  const parseUserId = (id: string | null): number => {
    if (!id) return 0;
    try {
      return parseInt(id, 10);
    } catch (e) {
      console.error('[useWallet] Error parsing user ID:', e);
      return 0;
    }
  };
  
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
        const wallet = await getUserWallet(parseUserId(targetUserId));
        
        if (wallet) {
          console.log(`[useWallet] Found wallet for user ${targetUserId}:`, wallet);
          setWalletData(wallet);
          setWalletAddress(wallet.address);
        } else {
          console.log(`[useWallet] No wallet found in database for ${targetUserId}`);
          setWalletData(null);
          setWalletAddress(null);
        }
      } catch (err) {
        console.error('[useWallet] Error loading wallet:', err);
        setError('Failed to load wallet data');
        
        // No fallback needed, just reset the state
        setWalletData(null);
        setWalletAddress(null);
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
      await addWalletAddress(
        address,
        parseUserId(targetUserId) || 999,
        user?.username || 'Anonymous',
        false // Not permanent by default
      );
      
      // Update local state
      const newWalletData: WalletData = {
        address,
        userId: parseUserId(targetUserId) || 999,
        username: user?.username || 'Anonymous',
        isPermanent: false,
        timestamp: Date.now()
      };
      
      setWalletData(newWalletData);
      setWalletAddress(address);
      
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
      // First remove the old wallet
      if (walletAddress) {
        // We need to remove the old wallet address first
        await removeWalletAddress(walletAddress, parseUserId(targetUserId) || 999);
      }
      
      // Add the new wallet address
      await addWalletAddress(
        address,
        parseUserId(targetUserId) || 999,
        user?.username || 'Anonymous',
        false // Not permanent by default
      );
      
      // Update local state
      const updatedWalletData: WalletData = {
        address,
        userId: parseUserId(targetUserId) || 999, 
        username: user?.username || 'Anonymous',
        isPermanent: false,
        timestamp: Date.now()
      };
      
      setWalletData(updatedWalletData);
      setWalletAddress(address);
      
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
      // Get the wallet address for the user
      const wallet = await getUserWallet(parseUserId(targetUserId) || 999);
      
      // Remove the wallet from the database
      if (wallet && wallet.address) {
        await removeWalletAddress(wallet.address, parseUserId(targetUserId) || 999);
      }
      
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