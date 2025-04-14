import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  isMetaMaskInstalled,
  requestAccount,
  getConnectedAccounts,
  sendTransaction,
  listenForAccountChanges,
  listenForChainChanges,
  removeMetaMaskListeners,
} from "@/lib/web3";

export const useWeb3 = () => {
  const { user, connectWallet } = useAuth();
  const { toast } = useToast();
  const [address, setAddress] = useState<string | null>(user?.walletAddress || null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Check if MetaMask is installed and get account on mount
  useEffect(() => {
    const checkMetaMask = async () => {
      const installed = isMetaMaskInstalled();
      setIsInstalled(installed);
      
      if (installed) {
        try {
          const accounts = await getConnectedAccounts();
          if (accounts.length > 0) {
            setAddress(accounts[0]);
          }
        } catch (error) {
          console.error("Error getting connected accounts:", error);
        }
      }
    };
    
    checkMetaMask();
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isInstalled) {
      toast({
        title: "MetaMask not installed",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      setIsConnecting(true);
      const accounts = await requestAccount();
      
      if (accounts.length > 0) {
        const walletAddress = accounts[0];
        setAddress(walletAddress);
        
        if (user) {
          await connectWallet(walletAddress);
        }
        
        toast({
          title: "Wallet connected",
          description: "Your MetaMask wallet has been connected successfully",
        });
        
        return walletAddress;
      }
      return null;
    } catch (error: any) {
      toast({
        title: "Failed to connect wallet",
        description: error.message || "Check if MetaMask is unlocked and try again",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [isInstalled, user, connectWallet, toast]);

  // Send transaction
  const send = useCallback(async (
    toAddress: string, 
    amount: string,
    data: string = ""
  ) => {
    if (!isInstalled) {
      toast({
        title: "MetaMask not installed",
        description: "Please install MetaMask to send transactions",
        variant: "destructive",
      });
      return null;
    }
    
    if (!address) {
      const connectedAddress = await connect();
      if (!connectedAddress) return null;
    }
    
    try {
      setIsSending(true);
      const txHash = await sendTransaction(toAddress, amount, data);
      
      toast({
        title: "Transaction sent",
        description: "Your transaction has been sent successfully",
      });
      
      return txHash;
    } catch (error: any) {
      toast({
        title: "Transaction failed",
        description: error.message || "An error occurred while sending the transaction",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSending(false);
    }
  }, [isInstalled, address, connect, toast]);

  // Account change handler
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setAddress(null);
      toast({
        title: "Wallet disconnected",
        description: "Your MetaMask wallet has been disconnected",
      });
    } else {
      setAddress(accounts[0]);
      toast({
        title: "Account changed",
        description: "Your MetaMask account has been changed",
      });
    }
  }, [toast]);

  // Chain change handler
  const handleChainChanged = useCallback(() => {
    // We currently don't need to do anything special here,
    // but in the future we might want to check if the chain is supported
    toast({
      title: "Network changed",
      description: "The Ethereum network has been changed in MetaMask",
    });
  }, [toast]);

  // Set up listeners
  useEffect(() => {
    if (isInstalled) {
      listenForAccountChanges(handleAccountsChanged);
      listenForChainChanges(handleChainChanged);
    }
    
    return () => {
      if (isInstalled) {
        removeMetaMaskListeners();
      }
    };
  }, [isInstalled, handleAccountsChanged, handleChainChanged]);

  return {
    address,
    isInstalled,
    isConnecting,
    isSending,
    connect,
    send,
  };
};
