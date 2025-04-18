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
  // First check if we've stored a wallet connection in localStorage
  const hasStoredWalletConnection = localStorage.getItem('wallet_connected') === 'true';
  
  // If we have a stored connection, return true immediately
  if (hasStoredWalletConnection) {
    console.log('Wallet previously connected according to localStorage');
    return true;
  }
  
  // Otherwise check with MetaMask
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
      // Mark the wallet as connected in localStorage
      localStorage.setItem('wallet_connected', 'true');
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
        // Support for Ganache local network
        if (chainId === 1337) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x539", // 1337 in hex
                chainName: "Ganache Network",
                nativeCurrency: {
                  name: "Ethereum",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["http://127.0.0.1:8545/"],
                blockExplorerUrls: null,
              },
            ],
          });
          return true;
        }
        // Also support Sepolia testnet
        else if (chainId === 11155111) {
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
 * Send ETH directly to a recipient address
 */
export const sendETH = async (
  recipientAddress: string, 
  amount: string
): Promise<{ transactionHash: string } | null> => {
  if (!isMetaMaskInstalled()) return null;
  
  try {
    console.log(`[sendETH] Sending ${amount} ETH to ${recipientAddress}`);
    
    // Convert from ETH to wei
    const amountInWei = ethers.parseEther(amount);
    
    // Get the provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const fromAddress = await signer.getAddress();
    
    console.log(`[sendETH] From address: ${fromAddress}`);
    console.log(`[sendETH] Amount in wei: ${amountInWei.toString()}`);
    
    // Prepare transaction parameters
    const tx = {
      from: fromAddress,
      to: recipientAddress,
      value: amountInWei,
      // Optional parameters:
      // nonce: await provider.getTransactionCount(fromAddress, "latest"),
      // gasLimit: ethers.BigNumber.from(21000),
      // gasPrice: await provider.getGasPrice(),
    };
    
    // Send the transaction
    console.log(`[sendETH] Sending transaction:`, tx);
    const transaction = await signer.sendTransaction(tx);
    
    // Wait for transaction to be mined
    console.log(`[sendETH] Transaction sent, hash: ${transaction.hash}`);
    console.log(`[sendETH] Waiting for transaction to be mined...`);
    
    const receipt = await transaction.wait();
    console.log(`[sendETH] Transaction confirmed in block ${receipt?.blockNumber}`);
    
    return {
      transactionHash: transaction.hash
    };
  } catch (error) {
    console.error("[sendETH] Error sending ETH:", error);
    throw error;
  }
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
            
            // Mark as connected in localStorage
            localStorage.setItem('wallet_connected', 'true');
            
            // Also save wallet address to Firebase on initial load
            try {
              // Import Firebase modules dynamically to avoid circular dependencies
              const { auth } = await import("../firebase/config");
              const { saveWalletAddress } = await import("../firebase/walletDatabase");
              const { updateUser } = await import("../firebase/database");
              
              if (auth.currentUser) {
                const userId = auth.currentUser.uid;
                console.log("[useWeb3] Initial load - Saving wallet address to Firebase for user:", userId);
                
                // Get user role from localStorage if available
                const userRole = localStorage.getItem('user_role') || 'investor';
                
                // Save to dedicated wallet database
                await addWalletAddress(
                  userAddress,
                  parseInt(userId) || 999,
                  auth.currentUser.displayName || auth.currentUser.email || 'User',
                  false
                );
                
                // Also update the user profile
                await updateUser(userId, { walletAddress: userAddress });
                console.log("[useWeb3] Initial load - Successfully saved wallet address to Firebase");
              } else {
                console.log("[useWeb3] Initial load - No authenticated user found for wallet saving");
              }
            } catch (saveError) {
              console.error("[useWeb3] Initial load - Error saving wallet to Firebase:", saveError);
              // Continue even if Firebase save fails
            }
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
        localStorage.removeItem('wallet_connected');
        console.log("[useWeb3] All accounts disconnected, removing wallet connection from localStorage");
      } else {
        // Connected or changed account
        const newAddress = accounts[0];
        setAddress(newAddress);
        
        // Update balance
        const userBalance = await getWalletBalance(newAddress);
        setBalance(userBalance);
        
        // Mark as connected in localStorage
        localStorage.setItem('wallet_connected', 'true');
        
        // Save wallet address to Firebase when account changes
        try {
          // Import Firebase modules dynamically to avoid circular dependencies
          const { auth } = await import("../firebase/config");
          const { saveWalletAddress } = await import("../firebase/walletDatabase");
          const { updateUser } = await import("../firebase/database");
          
          if (auth.currentUser) {
            const userId = auth.currentUser.uid;
            console.log("[useWeb3] Account changed, saving new wallet address to Firebase for user:", userId);
            
            // Get user role from localStorage if available
            const userRole = localStorage.getItem('user_role') || 'investor';
            
            // Save to dedicated wallet database
            await saveWalletAddress(
              userId,
              newAddress,
              auth.currentUser.displayName || auth.currentUser.email || 'User',
              userRole
            );
            
            // Also update the user profile
            await updateUser(userId, { walletAddress: newAddress });
            console.log("[useWeb3] Successfully saved new wallet address to Firebase");
          } else {
            console.log("[useWeb3] No authenticated user found for wallet saving on account change");
          }
        } catch (saveError) {
          console.error("[useWeb3] Error saving wallet to Firebase on account change:", saveError);
          // Continue even if Firebase save fails
        }
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
    console.log("[useWeb3] Connecting wallet...");
    
    try {
      const connectedAddress = await connectWallet();
      
      if (connectedAddress) {
        console.log("[useWeb3] Successfully connected wallet:", connectedAddress);
        setAddress(connectedAddress);
        
        // Mark wallet as connected in localStorage
        localStorage.setItem('wallet_connected', 'true');
        
        // Get balance
        const userBalance = await getWalletBalance(connectedAddress);
        setBalance(userBalance);
        
        // Get chain ID
        const userChainId = await getChainId();
        setChainId(userChainId);
        
        // Save wallet address to Firebase
        try {
          // Import Firebase modules dynamically to avoid circular dependencies
          const { auth } = await import("../firebase/config");
          const { saveWalletAddress } = await import("../firebase/walletDatabase");
          const { updateUser } = await import("../firebase/database");
          
          if (auth.currentUser) {
            const userId = auth.currentUser.uid;
            console.log("[useWeb3] Saving wallet address to Firebase for user:", userId);
            
            // Get user role from localStorage if available
            const userRole = localStorage.getItem('user_role') || 'investor';
            
            // Save to dedicated wallet database
            await saveWalletAddress(
              userId,
              connectedAddress,
              auth.currentUser.displayName || auth.currentUser.email || 'User',
              userRole
            );
            
            // Also update the user profile
            await updateUser(userId, { walletAddress: connectedAddress });
            console.log("[useWeb3] Successfully saved wallet address to Firebase");
          } else {
            console.log("[useWeb3] No authenticated user found for wallet saving");
          }
        } catch (saveError) {
          console.error("[useWeb3] Error saving wallet to Firebase:", saveError);
          // Continue even if Firebase save fails
        }
        
        return true;
      }
      
      console.log("[useWeb3] Failed to connect wallet");
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