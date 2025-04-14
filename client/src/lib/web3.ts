import { ethers } from "ethers";
import { useEffect, useState } from "react";

// Extend Window interface to include ethereum property
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Detect if MetaMask is installed
 */
export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== "undefined" && window.ethereum !== undefined;
};

/**
 * Check if a wallet is connected
 */
export const isWalletConnected = async (): Promise<boolean> => {
  if (!isMetaMaskInstalled()) return false;
  
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.listAccounts();
    return accounts.length > 0;
  } catch (error) {
    console.error("Error checking if wallet is connected:", error);
    return false;
  }
};

/**
 * Connect to MetaMask
 */
export const connectWallet = async (): Promise<string | null> => {
  if (!isMetaMaskInstalled()) return null;
  
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    
    if (accounts.length > 0) {
      return accounts[0];
    }
    
    return null;
  } catch (error) {
    console.error("Error connecting wallet:", error);
    return null;
  }
};

/**
 * Get wallet balance
 */
export const getWalletBalance = async (address: string): Promise<string> => {
  if (!isMetaMaskInstalled() || !address) return "0";
  
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    return "0";
  }
};

/**
 * Get connected chain ID
 */
export const getChainId = async (): Promise<number | null> => {
  if (!isMetaMaskInstalled()) return null;
  
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    return Number(network.chainId);
  } catch (error) {
    console.error("Error getting chain ID:", error);
    return null;
  }
};

/**
 * Change network
 */
export const switchNetwork = async (chainId: number): Promise<boolean> => {
  if (!isMetaMaskInstalled()) return false;
  
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return true;
  } catch (error: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      // Add the network
      try {
        // For now we only support Sepolia testnet
        if (chainId === 11155111) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia Testnet",
                nativeCurrency: {
                  name: "Sepolia ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://sepolia.infura.io/v3/"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
          return true;
        }
      } catch (addError) {
        console.error("Error adding network:", addError);
        return false;
      }
    }
    console.error("Error switching network:", error);
    return false;
  }
};

/**
 * Listen for account changes
 */
export const listenToAccountChanges = (callback: (accounts: string[]) => void): () => void => {
  if (!isMetaMaskInstalled()) return () => {};
  
  const handleAccountsChanged = (accounts: string[]) => {
    callback(accounts);
  };
  
  window.ethereum.on("accountsChanged", handleAccountsChanged);
  
  return () => {
    window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  };
};

/**
 * Listen for chain changes
 */
export const listenToChainChanges = (callback: (chainId: string) => void): () => void => {
  if (!isMetaMaskInstalled()) return () => {};
  
  const handleChainChanged = (chainId: string) => {
    callback(chainId);
  };
  
  window.ethereum.on("chainChanged", handleChainChanged);
  
  return () => {
    window.ethereum.removeListener("chainChanged", handleChainChanged);
  };
};

/**
 * Custom hook to use Web3
 */
export const useWeb3 = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  
  // Check MetaMask installation on mount
  useEffect(() => {
    setIsInstalled(isMetaMaskInstalled());
  }, []);
  
  // Check if connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (isMetaMaskInstalled()) {
        const connected = await isWalletConnected();
        
        if (connected) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          
          if (accounts.length > 0) {
            const userAddress = accounts[0].address;
            setAddress(userAddress);
            
            // Get balance
            const userBalance = await getWalletBalance(userAddress);
            setBalance(userBalance);
            
            // Get chain ID
            const network = await provider.getNetwork();
            setChainId(Number(network.chainId));
          }
        }
      }
    };
    
    checkConnection();
  }, []);
  
  // Listen for account and chain changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;
    
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // Disconnected
        setAddress(null);
        setBalance("0");
      } else {
        // Connected or changed account
        setAddress(accounts[0]);
        const userBalance = await getWalletBalance(accounts[0]);
        setBalance(userBalance);
      }
    };
    
    const handleChainChanged = (chainIdHex: string) => {
      setChainId(parseInt(chainIdHex, 16));
    };
    
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);
  
  // Connect wallet function
  const connect = async (): Promise<boolean> => {
    if (!isMetaMaskInstalled()) return false;
    
    setIsConnecting(true);
    
    try {
      const connectedAddress = await connectWallet();
      
      if (connectedAddress) {
        setAddress(connectedAddress);
        
        // Get balance
        const userBalance = await getWalletBalance(connectedAddress);
        setBalance(userBalance);
        
        // Get chain ID
        const userChainId = await getChainId();
        setChainId(userChainId);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Switch network function
  const switchToNetwork = async (newChainId: number): Promise<boolean> => {
    const success = await switchNetwork(newChainId);
    
    if (success) {
      setChainId(newChainId);
      return true;
    }
    
    return false;
  };
  
  return {
    address,
    chainId,
    balance,
    isInstalled,
    isConnecting,
    connect,
    switchNetwork: switchToNetwork,
  };
};