import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Define wallet data interface
export interface WalletData {
  address: string;
  userId: number;
  username: string;
  isPermanent: boolean;
  timestamp: number;
}

export const useWallet = (userId?: string | null) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use either provided userId or the authenticated user's ID
  const targetUserId = userId || (user ? user.id : null);
  
  // For safer number parsing that works with both numeric and string IDs
  const parseUserId = (id: string | number | null): number => {
    if (id === null || id === undefined) return 0;
    
    if (typeof id === 'number') return id;
    
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
        // Get wallet from MongoDB API
        const response = await fetch(`/api/wallets/user/${targetUserId}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.walletAddress) {
            console.log(`[useWallet] Found wallet for user ${targetUserId}:`, data.walletAddress);
            
            // Create wallet data object from API response
            const wallet: WalletData = {
              address: data.walletAddress,
              userId: parseUserId(targetUserId),
              username: user?.username || 'Anonymous',
              isPermanent: data.isPermanent || false,
              timestamp: data.timestamp || Date.now()
            };
            
            setWalletData(wallet);
            setWalletAddress(data.walletAddress);
          } else {
            console.log(`[useWallet] No wallet found in database for ${targetUserId}`);
            setWalletData(null);
            setWalletAddress(null);
          }
        } else {
          console.log(`[useWallet] API error: ${response.status}`);
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
  }, [targetUserId, user]);
  
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
      // Save wallet address to MongoDB through API
      const response = await fetch('/api/user/wallet/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUserId.toString(),
          walletAddress: address,
          userType: user?.role || 'investor',
          isPermanent: false // Not permanent by default
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to connect wallet: ${response.status}`);
      }
      
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
      // Update wallet through API (our API will handle removing old wallet and adding new one)
      const response = await fetch('/api/user/wallet/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUserId.toString(),
          walletAddress: address,
          userType: user?.role || 'investor',
          isPermanent: false, // Not permanent by default
          replace: true // Indicate this is a replacement
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update wallet: ${response.status}`);
      }
      
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
  }, [targetUserId, user, toast]);
  
  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    if (!targetUserId) {
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Remove wallet through API
      const response = await fetch('/api/user/wallet/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUserId.toString()
        })
      });
      
      if (!response.ok) {
        console.warn(`[useWallet] API warning: ${response.status}`);
        // Continue execution even if API fails
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
  
  // Make wallet permanent (will not be removed on logout)
  const makePermanent = useCallback(async () => {
    if (!targetUserId || !walletAddress) {
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Make permanent through API
      const response = await fetch('/api/user/wallet/permanent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUserId.toString(),
          walletAddress,
          isPermanent: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to make wallet permanent: ${response.status}`);
      }
      
      // Update local state
      if (walletData) {
        const updatedWalletData = {
          ...walletData,
          isPermanent: true
        };
        setWalletData(updatedWalletData);
      }
      
      toast({
        title: 'Wallet Settings Updated',
        description: 'Your wallet is now permanently connected to your account',
      });
      
      return true;
    } catch (err) {
      console.error('[useWallet] Error making wallet permanent:', err);
      setError('Failed to update wallet settings');
      
      toast({
        title: 'Update Failed',
        description: 'Failed to update your wallet settings. Please try again.',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, walletAddress, walletData, toast]);
  
  return {
    walletData,
    walletAddress,
    isLoading,
    error,
    connectWallet,
    updateWallet,
    disconnectWallet,
    makePermanent,
    hasWallet: !!walletAddress
  };
};

export default useWallet;