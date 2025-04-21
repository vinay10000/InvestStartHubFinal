import { useState, useEffect, useCallback } from 'react';
import { 
  isMetaMaskInstalled, 
  connectWallet,
  isWalletConnected,
  getWalletBalance,
  getChainId,
  switchNetwork,
  listenToAccountChanges,
  listenToChainChanges,
  sendETH
} from '@/lib/web3';
import { useToast } from '@/hooks/use-toast';
// MongoDB auth context
import { useAuth } from '@/context/MongoAuthContext';
import { apiRequest } from '@/lib/queryClient';

// Helper function to get network name from chain ID
const getNetworkName = (chainId: number | null): string => {
  if (chainId === 1) return "Ethereum Mainnet";
  if (chainId === 1337) return "Ganache Network";
  if (chainId === 11155111) return "Sepolia Testnet";
  if (chainId === 137) return "Polygon Mainnet";
  if (chainId === 80001) return "Mumbai Testnet";
  return chainId ? `Unknown Network (${chainId})` : "Unknown";
};

export const useWeb3 = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if MetaMask is installed on component mount
  useEffect(() => {
    const checkMetaMask = async () => {
      // Check for wallet connection in localStorage
      const localStorageWalletStatus = localStorage.getItem('wallet_connected');
      const isStoredAsConnected = localStorageWalletStatus === 'true';

      // Log for debugging
      console.log("[useWeb3] Init - localStorage wallet status:", localStorageWalletStatus);
      
      const installed = isMetaMaskInstalled();
      setIsInstalled(installed);
      
      // Always attempt connection if stored as connected or if MetaMask reports connected
      if (installed) {
        try {
          // Prioritize checking if MetaMask thinks we're connected
          const metaMaskReportsConnected = await isWalletConnected();
          console.log("[useWeb3] Init - MetaMask reports connected:", metaMaskReportsConnected);
          
          if (metaMaskReportsConnected || isStoredAsConnected) {
            console.log("[useWeb3] Init - Attempting to connect wallet");
            const connectedAddress = await connectWallet();
            
            if (connectedAddress) {
              console.log("[useWeb3] Init - Successfully connected to", connectedAddress);
              setAddress(connectedAddress);
              
              // Mark wallet as connected in localStorage
              localStorage.setItem('wallet_connected', 'true');
              
              // Get chain ID
              const currentChainId = await getChainId();
              if (currentChainId) {
                setChainId(currentChainId.toString());
                
                // Set network name based on chain ID
                setNetworkName(getNetworkName(currentChainId));
              }
              
              // Get balance
              if (connectedAddress) {
                const balanceValue = await getWalletBalance(connectedAddress);
                setBalance(balanceValue);
              }
            } else {
              console.log("[useWeb3] Init - Could not get connected address, clearing localStorage flag");
              // If we couldn't connect even though localStorage said we should, reset the flag
              localStorage.removeItem('wallet_connected');
            }
          }
        } catch (error) {
          console.error('[useWeb3] Error initializing Web3:', error);
          // On error, clear localStorage to prevent stuck states
          localStorage.removeItem('wallet_connected');
        }
      }
    };
    
    checkMetaMask();
  }, []);
  
  // Set up listeners for account and network changes
  useEffect(() => {
    if (!isInstalled) return;
    
    const accountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        setAddress(null);
        setBalance(null);
      } else {
        const newAddress = accounts[0];
        setAddress(newAddress);
        
        // Update balance for new account
        getWalletBalance(newAddress)
          .then((newBalance: string) => setBalance(newBalance))
          .catch((error: Error) => console.error('Error getting balance:', error));
        
        // When account changes, also save the new wallet address to MongoDB
        try {
          // Get the current user from MongoDB auth context
          if (user?.id) {
            const userId = user.id;
            console.log("[useWeb3] Account changed, saving new wallet address to MongoDB for user:", userId);
            
            // Get user role from user object or localStorage
            const userRole = user.role || localStorage.getItem('user_role') || 'investor';
            
            // Save wallet to MongoDB via API
            const response = await apiRequest('POST', '/api/user/wallet/connect', {
              userId: userId,
              walletAddress: newAddress,
              isPermanent: false // Not permanent by default
            });
            
            if (response.ok) {
              console.log("[useWeb3] Successfully saved changed wallet to MongoDB");
            } else {
              console.error("[useWeb3] Error response from wallet connect API:", await response.text());
            }
          }
        } catch (saveError) {
          console.error("[useWeb3] Error saving changed wallet to MongoDB:", saveError);
          // Continue even if MongoDB save fails
        }
      }
    };
    
    const chainChanged = async (newChainIdHex: string) => {
      // Force refresh when chain changes
      setChainId(newChainIdHex);
      
      try {
        // Convert hex chainId to number for network name lookup
        const newChainIdNum = parseInt(newChainIdHex, 16);
        setNetworkName(getNetworkName(newChainIdNum));
        
        // Also update balance as it might be different on new chain
        if (address) {
          const newBalance = await getWalletBalance(address);
          setBalance(newBalance);
        }
      } catch (error) {
        console.error('Error updating network details:', error);
      }
    };
    
    const accountCleanup = listenToAccountChanges(accountsChanged);
    const networkCleanup = listenToChainChanges(chainChanged);
    
    return () => {
      accountCleanup();
      networkCleanup();
    };
  }, [isInstalled, address, user]);
  
  // Connect wallet function
  const connect = useCallback(async () => {
    // If we already have an address, just return success without reconnecting
    if (address) {
      console.log("[useWeb3] Connect - Wallet already connected with address:", address);
      return true;
    }
    
    if (!isInstalled) {
      toast({
        title: 'MetaMask Required',
        description: 'Please install MetaMask to use this feature',
        variant: 'destructive',
      });
      return false;
    }
    
    setIsLoading(true);
    console.log("[useWeb3] Connect - Attempting to connect wallet");
    
    try {
      const connectedAddress = await connectWallet();
      
      if (connectedAddress) {
        console.log("[useWeb3] Connect - Successfully connected to", connectedAddress);
        setAddress(connectedAddress);
        
        // Always mark wallet as connected in localStorage
        localStorage.setItem('wallet_connected', 'true');
        
        // Get chain ID
        const currentChainId = await getChainId();
        if (currentChainId) {
          setChainId(currentChainId.toString());
          
          // Set network name based on chain ID
          setNetworkName(getNetworkName(currentChainId));
        }
        
        // Get balance
        const balanceValue = await getWalletBalance(connectedAddress);
        setBalance(balanceValue);
        
        // Try to get user information to save to MongoDB
        try {
          // Get the current user from MongoDB auth
          if (user?.id) {
            const userId = user.id;
            console.log("[useWeb3] Saving wallet address to MongoDB for user:", userId);
            
            // Get user role from user object or localStorage
            const userRole = user.role || localStorage.getItem('user_role') || 'investor';
            
            // Save wallet to MongoDB via API
            const response = await apiRequest('POST', '/api/user/wallet/connect', {
              userId: userId,
              walletAddress: connectedAddress,
              isPermanent: false // Not permanent by default
            });
            
            if (response.ok) {
              console.log("[useWeb3] Successfully saved wallet to MongoDB");
            } else {
              console.error("[useWeb3] Error response from wallet connect API:", await response.text());
            }
          } else {
            console.log("[useWeb3] No authenticated user found for wallet saving");
          }
        } catch (saveError) {
          console.error("[useWeb3] Error saving wallet to MongoDB:", saveError);
          // Continue even if MongoDB save fails - the wallet is still connected locally
        }
        
        toast({
          title: 'Wallet Connected',
          description: `Connected to ${connectedAddress.substring(0, 6)}...${connectedAddress.substring(38)}`,
        });
        
        return true;
      }
      
      console.log("[useWeb3] Connect - Failed to get connected address");
      localStorage.removeItem('wallet_connected');
      return false;
    } catch (error: any) {
      console.error("[useWeb3] Connect - Error:", error);
      localStorage.removeItem('wallet_connected');
      
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect to MetaMask',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInstalled, toast, address, user]);
  
  // Switch network function
  const changeNetwork = useCallback(async (newChainIdStr: string) => {
    if (!isInstalled) {
      toast({
        title: 'MetaMask Required',
        description: 'Please install MetaMask to use this feature',
        variant: 'destructive',
      });
      return false;
    }
    
    setIsLoading(true);
    
    try {
      // Convert string to number for switchNetwork
      const newChainId = parseInt(newChainIdStr, 10);
      
      const success = await switchNetwork(newChainId);
      if (success) {
        // Network details will be updated by the network change listener
        toast({
          title: 'Network Changed',
          description: 'Successfully switched network',
        });
        return true;
      }
      return false;
    } catch (error: any) {
      toast({
        title: 'Network Switch Failed',
        description: error.message || 'Failed to switch network',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInstalled, toast]);
  
  // Refresh balance function
  const refreshBalance = useCallback(async () => {
    if (!address) return;
    
    try {
      const newBalance = await getWalletBalance(address);
      setBalance(newBalance);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  }, [address]);
  
  // Helper method to check if wallet is connected - ONLY checks MetaMask browser connection,
  // not database status. This is important to separate database record from active browser connection
  const isWalletConnected = useCallback(() => {
    // Only consider wallet connected if we actually have an address from MetaMask
    return Boolean(address);
  }, [address]);

  // Send ETH directly to another address
  const sendDirectETH = async (recipientAddress: string, amount: string) => {
    try {
      return await sendETH(recipientAddress, amount);
    } catch (error) {
      console.error("Error in sendDirectETH:", error);
      throw error;
    }
  };

  return {
    isInstalled,
    isLoading,
    address,
    balance,
    networkName,
    chainId,
    connect,
    changeNetwork,
    refreshBalance,
    isWalletConnected,
    sendDirectETH
  };
};