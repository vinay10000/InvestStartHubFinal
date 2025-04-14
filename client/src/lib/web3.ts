import { ethers } from "ethers";

// Check if MetaMask is installed
export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== 'undefined' && window.ethereum !== undefined;
};

// Request account access
export const requestAccount = async (): Promise<string[]> => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return accounts;
  } catch (error) {
    console.error("User denied account access");
    throw error;
  }
};

// Get connected accounts
export const getConnectedAccounts = async (): Promise<string[]> => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts;
  } catch (error) {
    console.error("Error getting connected accounts", error);
    throw error;
  }
};

// Get current chain ID
export const getChainId = async (): Promise<string> => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId;
  } catch (error) {
    console.error("Error getting chain ID", error);
    throw error;
  }
};

// Send Ethereum transaction
export const sendTransaction = async (
  toAddress: string, 
  amount: string, 
  data: string = ""
): Promise<string> => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }
  
  try {
    const accounts = await requestAccount();
    const fromAddress = accounts[0];
    
    // Convert amount to wei
    const amountWei = ethers.utils.parseEther(amount).toString();
    
    const txParams = {
      from: fromAddress,
      to: toAddress,
      value: ethers.utils.hexlify(amountWei),
      data: data ? ethers.utils.hexlify(ethers.utils.toUtf8Bytes(data)) : "0x",
    };
    
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    });
    
    return txHash;
  } catch (error) {
    console.error("Error sending transaction", error);
    throw error;
  }
};

// Listen for account changes
export const listenForAccountChanges = (callback: (accounts: string[]) => void): void => {
  if (!isMetaMaskInstalled()) {
    console.error("MetaMask is not installed");
    return;
  }
  
  window.ethereum.on('accountsChanged', callback);
};

// Listen for chain changes
export const listenForChainChanges = (callback: (chainId: string) => void): void => {
  if (!isMetaMaskInstalled()) {
    console.error("MetaMask is not installed");
    return;
  }
  
  window.ethereum.on('chainChanged', callback);
};

// Remove event listeners
export const removeMetaMaskListeners = (): void => {
  if (!isMetaMaskInstalled()) {
    console.error("MetaMask is not installed");
    return;
  }
  
  window.ethereum.removeAllListeners('accountsChanged');
  window.ethereum.removeAllListeners('chainChanged');
};

// Get transaction receipt
export const getTransactionReceipt = async (txHash: string): Promise<any> => {
  if (!isMetaMaskInstalled()) {
    throw new Error("MetaMask is not installed");
  }
  
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const receipt = await provider.getTransactionReceipt(txHash);
    return receipt;
  } catch (error) {
    console.error("Error getting transaction receipt", error);
    throw error;
  }
};
