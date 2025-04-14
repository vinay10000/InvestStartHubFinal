import { useState, useEffect, useCallback } from 'react';
import { 
  isMetaMaskInstalled,
  connectToMetaMask,
  getConnectedAccounts,
  getBalance,
  getNetworkDetails,
  switchNetwork,
  addAccountChangeListener,
  addNetworkChangeListener
} from '@/lib/web3';
import { useToast } from '@/hooks/use-toast';

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
      const installed = isMetaMaskInstalled();
      setIsInstalled(installed);
      
      if (installed) {
        try {
          // Check if user is already connected
          const accounts = await getConnectedAccounts();
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            
            // Get network details
            const network = await getNetworkDetails();
            setNetworkName(network.name);
            setChainId(network.chainId.toString());
            
            // Get balance
            const balanceValue = await getBalance(accounts[0]);
            setBalance(balanceValue);
          }
        } catch (error) {
          console.error('Error initializing Web3:', error);
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
        getBalance(accounts[0])
          .then(newBalance => setBalance(newBalance))
          .catch(error => console.error('Error getting balance:', error));
      }
    };
    
    const chainChanged = async (newChainId: string) => {
      // Force refresh when chain changes
      setChainId(newChainId);
      
      try {
        const network = await getNetworkDetails();
        setNetworkName(network.name);
        
        // Also update balance as it might be different on new chain
        if (address) {
          const newBalance = await getBalance(address);
          setBalance(newBalance);
        }
      } catch (error) {
        console.error('Error updating network details:', error);
      }
    };
    
    const accountCleanup = addAccountChangeListener(accountsChanged);
    const networkCleanup = addNetworkChangeListener(chainChanged);
    
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
    
    try {
      const accounts = await connectToMetaMask();
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        
        // Get network details
        const network = await getNetworkDetails();
        setNetworkName(network.name);
        setChainId(network.chainId.toString());
        
        // Get balance
        const balanceValue = await getBalance(accounts[0]);
        setBalance(balanceValue);
        
        toast({
          title: 'Wallet Connected',
          description: `Connected to ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`,
        });
        
        return true;
      }
      return false;
    } catch (error: any) {
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
  const changeNetwork = useCallback(async (newChainId: string) => {
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
      const newBalance = await getBalance(address);
      setBalance(newBalance);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
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
    refreshBalance
  };
};