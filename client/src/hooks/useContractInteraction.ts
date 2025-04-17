import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/useWeb3";
import * as contractInteraction from "@/lib/contractInteraction";

export const useContractInteraction = () => {
  const { toast } = useToast();
  const { address, isInstalled, connect } = useWeb3();
  const [isLoading, setIsLoading] = useState(false);

  // Connect wallet if needed
  const ensureWalletConnected = async (): Promise<boolean> => {
    if (!isInstalled) {
      toast({
        title: "MetaMask Required",
        description: "Please install MetaMask to interact with blockchain.",
        variant: "destructive",
      });
      return false;
    }

    if (!address) {
      try {
        const connected = await connect();
        if (!connected) {
          toast({
            title: "Wallet Connection Required",
            description: "Please connect your wallet to proceed.",
            variant: "destructive",
          });
          return false;
        }
        return true;
      } catch (error) {
        console.error("Error connecting wallet:", error);
        return false;
      }
    }

    return true;
  };

  // Invest in a startup
  const investInStartup = async (startupId: number, amount: string, founderWalletAddress?: string) => {
    const walletConnected = await ensureWalletConnected();
    if (!walletConnected) return null;

    setIsLoading(true);

    try {
      // Pass the founderWalletAddress to the contract interaction
      const result = await contractInteraction.investInStartup(startupId, amount, founderWalletAddress);
      
      toast({
        title: "Investment Successful",
        description: `You have successfully invested ${amount} ETH in startup #${startupId}`,
      });
      
      return result;
    } catch (error: any) {
      console.error("Error investing in startup:", error);
      
      toast({
        title: "Investment Failed",
        description: error.message || "Failed to invest in the startup",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a token for a startup
  const createStartupToken = async (
    startupId: number,
    startupName: string,
    tokenName: string,
    tokenSymbol: string,
    initialSupply: string,
    initialValuation: string,
    tokenDecimals = 18
  ) => {
    const walletConnected = await ensureWalletConnected();
    if (!walletConnected) return null;

    setIsLoading(true);

    try {
      const result = await contractInteraction.createStartupToken(
        startupId,
        startupName,
        tokenName,
        tokenSymbol,
        initialSupply,
        initialValuation,
        tokenDecimals
      );
      
      toast({
        title: "Token Created",
        description: `Created token ${tokenSymbol} for ${startupName}`,
      });
      
      return result;
    } catch (error: any) {
      console.error("Error creating startup token:", error);
      
      toast({
        title: "Token Creation Failed",
        description: error.message || "Failed to create token for the startup",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Get startup details from blockchain
  const getStartupDetails = async (startupId: number) => {
    try {
      return await contractInteraction.getStartupFromContract(startupId);
    } catch (error) {
      console.error("Error fetching startup details:", error);
      return null;
    }
  };

  // Check if token exists for a startup
  const checkTokenExists = async (startupId: number) => {
    try {
      return await contractInteraction.checkTokenExists(startupId);
    } catch (error) {
      console.error("Error checking if token exists:", error);
      return false;
    }
  };

  // Get token address for a startup
  const getTokenAddress = async (startupId: number) => {
    try {
      return await contractInteraction.getTokenAddress(startupId);
    } catch (error) {
      console.error("Error getting token address:", error);
      return null;
    }
  };

  // Get startup info from token
  const getStartupInfoFromToken = async (tokenAddress: string) => {
    try {
      return await contractInteraction.getStartupInfoFromToken(tokenAddress);
    } catch (error) {
      console.error("Error getting startup info from token:", error);
      return null;
    }
  };

  return {
    isLoading,
    investInStartup,
    createStartupToken,
    getStartupDetails,
    checkTokenExists,
    getTokenAddress,
    getStartupInfoFromToken,
  };
};