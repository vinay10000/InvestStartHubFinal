import { useState, useEffect, useCallback } from 'react';
import { 
  isMetaMaskInstalled, 
  connectWallet,
  isWalletConnected,
  getWalletBalance,
  getChainId,
  switchNetwork,
  listenToAccountChanges,
  listenToChainChanges
} from '@/lib/web3';
import { useToast } from '@/hooks/use-toast';

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
    
    const accountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        setAddress(null);
        setBalance(null);
      } else {
        setAddress(accounts[0]);
        // Update balance for new account
        getWalletBalance(accounts[0])
          .then((newBalance: string) => setBalance(newBalance))
          .catch((error: Error) => console.error('Error getting balance:', error));
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
  }, [isInstalled, address]);
  
  // Connect wallet function
  const connect = useCallback(async () => {
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
  }, [isInstalled, toast]);
  
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
  
  // Helper method to check if wallet is connected
  const isWalletConnected = useCallback(() => {
    return Boolean(address) || localStorage.getItem('wallet_connected') === 'true';
  }, [address]);

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
    isWalletConnected
  };
};