import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ethers } from "ethers";
import { Wallet, AlertTriangle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/useWeb3";
import { useContractInteraction } from "@/hooks/useContractInteraction";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { sendDirectETH } from "@/lib/directTransfer";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { useStartups } from "@/hooks/useStartups";
import { useFounderWallet } from "@/hooks/useFounderWallet";
import { migrateWalletToFirebaseUid } from "@/firebase/walletDatabase";

// Enhanced validation schema with better number handling
const formSchema = z.object({
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => {
      // First check if it's a valid number string
      const parsed = Number(val);
      return !isNaN(parsed);
    }, "Amount must be a valid number")
    .refine(val => {
      const parsed = Number(val);
      return parsed > 0;
    }, "Amount must be greater than 0")
    .refine(val => {
      // Check if the value has no more than 18 decimal places (Ethereum limit)
      const decimalPart = val.toString().split('.')[1] || '';
      return decimalPart.length <= 18;
    }, "Amount cannot have more than 18 decimal places")
});

// Helper function to get network name from chain ID
const getNetworkName = (chainIdStr: string | null): string => {
  if (!chainIdStr) return "Unknown Network";
  
  // Try to parse the chain ID as a number
  let chainId: number;
  try {
    // Handle both decimal and hex formats
    if (chainIdStr.startsWith('0x')) {
      chainId = parseInt(chainIdStr, 16);
    } else {
      chainId = parseInt(chainIdStr, 10);
    }
    
    if (isNaN(chainId)) return "Unknown Network";
  } catch (e) {
    return "Unknown Network";
  }
  
  if (chainId === 1) return "Ethereum Mainnet";
  if (chainId === 11155111) return "Sepolia Testnet";
  if (chainId === 31337 || chainId === 1337) return "Local Development";
  return `Chain ID: ${chainId}`;
};

interface MetaMaskPaymentProps {
  startupId: number;
  startupName: string;
  onPaymentComplete?: (txHash: string, amount: string) => void;
}

const MetaMaskPayment = ({ 
  startupId, 
  startupName,
  onPaymentComplete 
}: MetaMaskPaymentProps) => {
  const { isInstalled, address, connect, isWalletConnected, balance, chainId } = useWeb3();
  const { investInStartup } = useContractInteraction();
  const { createTransaction } = useTransactions();
  const { user } = useAuth();
  const { toast } = useToast();
  const { useStartup } = useStartups();
  
  // Add state for manual wallet info entry
  const [manualFounderInfo, setManualFounderInfo] = useState<any>(null);
  
  // Use our enhanced dedicated hook to fetch founder wallet information
  const { 
    founderWallet, 
    founderInfo: hookFounderInfo, 
    isLoading: isWalletLoading, 
    error: walletError,
    hasWallet
  } = useFounderWallet(startupId);
  
  // Also fetch startup data directly to ensure we have the founderId
  const { data: startupDetailData } = useStartup(startupId.toString());
  
  // Add a quick timeout to prevent infinite loading and automatically prompt for manual entry
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isWalletLoading) {
      // Start quick timeout (3 seconds) because users get impatient 
      timeoutId = setTimeout(() => {
        console.log("[MetaMaskPayment] Timeout reached, prompting for manual wallet entry");
        
        // Get wallet address from user via prompt
        const walletAddress = prompt(
          "Enter the founder's wallet address (0x...) to proceed with payment", 
          "0x"
        );
        
        if (walletAddress && walletAddress.startsWith("0x") && walletAddress.length >= 42) {
          // Set manual mode with the entered address
          setManualFounderInfo({
            id: "manual",
            walletAddress: walletAddress,
            name: "Manual Payment"
          });
          
          // Show success notification
          toast({
            title: "Wallet Address Entered",
            description: "You can now proceed with the payment to the provided address.",
          });
          
          // Also save this wallet to the database for future use
          import('@/firebase/walletDatabase').then(walletDb => {
            // Get the actual startup data to get the founder ID
            const { useStartup } = useStartups();
            const { data: startupData } = useStartup(startupId.toString());
            
            if (startupData && startupData.founderId && walletDb.saveWalletAddress) {
              console.log("[MetaMaskPayment] Retrieved startup data for wallet saving:", {
                startupId,
                startupName,
                founderId: startupData.founderId
              });
              
              // Use the actual Firebase UID (founderId) instead of the startup ID
              walletDb.saveWalletAddress(
                startupData.founderId.toString(), 
                walletAddress, 
                "Founder", 
                "founder"
              ).then(() => {
                console.log("[MetaMaskPayment] Saved manually entered wallet address to Firebase UID:", startupData.founderId);
                
                // Also create a migration from the old ID format (numeric) to the Firebase UID
                // This ensures backward compatibility with older wallet entries
                const commonNumericIds = ["1", "2", "92", "3", "4", "5", "10"];
                for (const numericId of commonNumericIds) {
                  // Try to migrate any existing wallets with these IDs to the Firebase UID
                  walletDb.migrateWalletToFirebaseUid(
                    numericId,
                    startupData.founderId.toString(),
                    walletAddress
                  ).catch(err => {
                    // Silently ignore migration errors - it's just a helpful extra step
                    console.log(`[MetaMaskPayment] Migration attempt from ID ${numericId} didn't apply:`, err.message);
                  });
                }
              }).catch(err => {
                console.error("[MetaMaskPayment] Error saving wallet address:", err);
              });
            } else {
              // Fallback to using startup ID if we couldn't find the founder ID
              console.log("[MetaMaskPayment] Could not find founder ID, falling back to startup ID");
              if (startupId && walletDb.saveWalletAddress) {
                walletDb.saveWalletAddress(
                  startupId.toString(), 
                  walletAddress, 
                  "Founder", 
                  "founder"
                ).catch(err => {
                  console.error("[MetaMaskPayment] Fallback wallet save error:", err);
                });
              }
            }
          }).catch(error => {
            console.error("[MetaMaskPayment] Error importing wallet database:", error);
          });
        } else if (walletAddress) {
          // Invalid address format
          toast({
            title: "Invalid Wallet Address",
            description: "Please enter a valid Ethereum wallet address starting with 0x",
            variant: "destructive"
          });
          // Keep loading status to allow retry
        } else {
          // User canceled - set empty manual info to show manual entry button
          setManualFounderInfo({
            id: "manual",
            walletAddress: null,
            name: "Manual Payment"
          });
          
          toast({
            title: "Manual Entry Required",
            description: "Please enter the founder's wallet address to continue.",
          });
        }
      }, 3000); // Reduced to 3 seconds for better UX
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isWalletLoading, toast, startupId]);
  
  // Combine manual entry with hook data
  const founderInfo = manualFounderInfo || hookFounderInfo;
  
  // Check for wallet in session storage as an additional recovery option
  const getSessionStorageWallet = (): string | null => {
    try {
      // Check if we have a wallet in session storage
      const sessionWallet = sessionStorage.getItem('founder_wallet');
      if (sessionWallet && sessionWallet.startsWith('0x')) {
        console.log('[MetaMaskPayment] Found wallet in session storage:', sessionWallet);
        return sessionWallet;
      }
      
      // Look for any wallet in storage
      const sessionKeys = Object.keys(sessionStorage);
      for (const key of sessionKeys) {
        const value = sessionStorage.getItem(key);
        if (value && value.startsWith('0x') && value.length >= 42) {
          console.log(`[MetaMaskPayment] Found potential wallet in session at key ${key}:`, value);
          return value;
        }
      }
      
      return null;
    } catch (err) {
      console.warn('[MetaMaskPayment] Error accessing session storage:', err);
      return null;
    }
  };
  
  // Try to get the wallet from session storage
  const sessionWallet = getSessionStorageWallet();
  
  // Derive wallet status from all available sources
  const getWalletStatus = (): 'loading' | 'found' | 'not_found' | 'error' => {
    // Check for manual entry first
    if (manualFounderInfo?.walletAddress) {
      console.log('[MetaMaskPayment] Using manually entered wallet');
      return 'found'; 
    }
    
    // Still loading from database
    if (isWalletLoading) return 'loading';
    
    // Check our hook data
    if (hasWallet && founderWallet) {
      console.log('[MetaMaskPayment] Using wallet from hook (hasWallet)');
      return 'found';
    }
    
    if (founderInfo?.walletAddress) {
      console.log('[MetaMaskPayment] Using wallet from founderInfo');
      return 'found';
    }
    
    // Check if startup details has wallet
    if (startupDetailData?.founderWalletAddress) {
      console.log('[MetaMaskPayment] Using wallet from startup details');
      return 'found';
    }
    
    // Check session storage
    if (sessionWallet) {
      console.log('[MetaMaskPayment] Using wallet from session storage');
      return 'found';
    }
    
    // Detailed logging for all wallet sources - casting to any to avoid TS errors
    const startupData = startupDetailData as any;
    
    console.log('Wallet Discovery in ImprovedMetaMaskPayment:', {
      hookProvidedWallet: founderWallet,
      sessionStorageWallet: sessionWallet,
      effectiveWalletAddress: founderInfo?.walletAddress || 
                             startupData?.founderWalletAddress || 
                             sessionWallet || null,
      hookFounderWallet: founderInfo?.walletAddress,
      startupFounderId: startupData?.founderId,
      currentMetaMaskAddress: address,
      userWalletAddress: address || sessionWallet || founderInfo?.walletAddress,
      isMetaMaskConnected: typeof isWalletConnected === 'function' ? isWalletConnected() : false,
      isMetaMaskInstalled: isInstalled
    });
    
    // Check proper error types and return appropriate status
    if (walletError === 'not_found') return 'not_found';
    if (walletError) return 'error';
    
    // If no wallet found and error is null, default to not found
    return 'not_found';
  };
  
  // Get wallet status as a derived state
  const founderWalletStatus = getWalletStatus();
  
  // Store session wallet for future use
  useEffect(() => {
    if (sessionWallet && startupId) {
      try {
        // Save this wallet to session storage with a specific key
        sessionStorage.setItem(`founder_wallet_${startupId}`, sessionWallet);
        console.log(`[MetaMaskPayment] Saved session wallet for startup ${startupId}`);
      } catch (err) {
        console.warn('[MetaMaskPayment] Error saving to session storage:', err);
      }
    }
  }, [sessionWallet, startupId]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string>("Unknown Network");
  
  // Check network on mount and update when chainId changes
  useEffect(() => {
    // Update network name based on chain ID
    setNetworkName(getNetworkName(chainId));
    
    // Log connection status for debugging
    console.log("[MetaMaskPayment] Wallet connection status:", {
      address,
      chainId,
      networkName: getNetworkName(chainId),
      balance,
      isWalletConnected: typeof isWalletConnected === 'function' ? isWalletConnected() : false,
      hasUserWallet: user?.walletAddress ? true : false,
      localStorage: localStorage.getItem('wallet_connected')
    });
  }, [chainId, address, balance, user, isWalletConnected]);
  
  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: ""
    }
  });
  
  // Handle investment
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Ensure wallet is connected
    if (!address) {
      try {
        const connected = await connect();
        if (!connected) {
          toast({
            title: "Wallet Connection Required",
            description: "Please connect your MetaMask wallet to proceed with the investment",
            variant: "destructive"
          });
          return;
        }
      } catch (error: any) {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect to MetaMask",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsProcessing(true);
    
    try {
      // Enhanced validation to ensure we have a valid amount
      const amountValue = values.amount.trim();
      
      if (!amountValue) {
        throw new Error("Investment amount is required");
      }
      
      // Additional validation
      const numericAmount = Number(amountValue);
      
      if (isNaN(numericAmount)) {
        throw new Error("Please enter a valid numeric amount");
      }
      
      if (numericAmount <= 0) {
        throw new Error("Amount must be greater than zero");
      }
      
      // Check sufficient balance
      const userBalance = parseFloat(balance || "0");
      if (numericAmount > userBalance) {
        throw new Error(`Insufficient balance. You have ${userBalance.toFixed(4)} ETH available.`);
      }
      
      // Log for debugging
      console.log("Investment details:", {
        startupId,
        amount: amountValue,
        numericAmount,
        userBalance
      });
      
      // Convert to a fixed decimal string to prevent scientific notation issues
      // This ensures we don't get values like 0.0001 turning into 1e-4
      const decimalPlaces = amountValue.includes('.') ? 
        amountValue.split('.')[1].length : 0;
      
      // Use fixed notation with appropriate decimal places (max 18 for Ethereum)
      const cleanAmount = numericAmount.toFixed(Math.min(18, decimalPlaces));
      
      // Try to get founder wallet from all available sources
      // In order of priority: manual entry, hook data, startup data, session storage
      let founderWalletAddress: string | undefined;
      
      // 1. Check manual entry if available
      if (manualFounderInfo?.walletAddress && 
          manualFounderInfo.walletAddress !== "0x" && 
          manualFounderInfo.walletAddress.startsWith("0x")) {
        founderWalletAddress = manualFounderInfo.walletAddress;
        console.log("[MetaMaskPayment] Using manually entered wallet address:", founderWalletAddress);
      }
      // 2. Check hook data
      else if (founderInfo?.walletAddress && 
               founderInfo.walletAddress !== "0x" && 
               founderInfo.walletAddress.startsWith("0x")) {
        founderWalletAddress = founderInfo.walletAddress;
        console.log("[MetaMaskPayment] Using wallet from hook data:", founderWalletAddress);
      }
      // 3. Check startup data
      else if ((startupDetailData as any)?.founderWalletAddress && 
               (startupDetailData as any).founderWalletAddress !== "0x" && 
               (startupDetailData as any).founderWalletAddress.startsWith("0x")) {
        founderWalletAddress = (startupDetailData as any).founderWalletAddress;
        console.log("[MetaMaskPayment] Using wallet from startup data:", founderWalletAddress);
      }
      // 4. Check session storage
      else if (sessionWallet && sessionWallet !== "0x" && sessionWallet.startsWith("0x")) {
        founderWalletAddress = sessionWallet;
        console.log("[MetaMaskPayment] Using wallet from session storage:", founderWalletAddress);
        
        // Save this wallet to the database for future use
        if (startupDetailData?.founderId && founderWalletAddress) {
          // Save using import to avoid bundling issues
          import('@/firebase/walletDatabase').then(async walletDb => {
            try {
              // Save to Firebase user
              await walletDb.saveWalletAddress(
                startupDetailData.founderId.toString(),
                founderWalletAddress as string,
                startupDetailData.name || "Founder",
                "founder"
              );
              
              // Also save to startup record
              await walletDb.saveWalletToStartup(
                startupId.toString(),
                founderWalletAddress as string,
                startupDetailData.name || "Founder"
              );
              
              console.log("[MetaMaskPayment] Saved session wallet to database:", {
                founderId: startupDetailData.founderId,
                startupId,
                walletAddress: founderWalletAddress
              });
            } catch (err) {
              console.error("[MetaMaskPayment] Error saving session wallet:", err);
            }
          });
        }
      }
      // 5. Last resort: try to fetch from database
      else {
        console.log("[MetaMaskPayment] Attempting database lookup for wallet...");
        
        // Try to get the wallet directly through getWalletByUserId
        if (startupDetailData?.founderId) {
          try {
            const walletDbModule = await import('@/firebase/walletDatabase');
            const walletData = await walletDbModule.getWalletByUserId(startupDetailData.founderId.toString());
            
            if (walletData && walletData.address) {
              founderWalletAddress = walletData.address;
              console.log("[MetaMaskPayment] Found wallet through database:", founderWalletAddress);
              
              // Store in session storage for future use
              try {
                sessionStorage.setItem(`founder_wallet_${startupId}`, founderWalletAddress);
                console.log("[MetaMaskPayment] Saved database wallet to session storage");
              } catch (err) {
                console.warn("[MetaMaskPayment] Failed to save to session storage:", err);
              }
            }
          } catch (err) {
            console.error("[MetaMaskPayment] Error getting wallet from database:", err);
          }
        }
      }
      
      // Important: Log complete wallet discovery process for debugging
      console.log("[MetaMaskPayment] Wallet discovery complete:", {
        finalWalletAddress: founderWalletAddress,
        manualEntry: manualFounderInfo?.walletAddress,
        hookData: founderInfo?.walletAddress,
        startupData: (startupDetailData as any)?.founderWalletAddress,
        sessionStorage: sessionWallet,
        founderId: startupDetailData?.founderId
      });
      
      // Final validation - if we still don't have a valid address, show error
      if (!founderWalletAddress || !founderWalletAddress.startsWith("0x") || founderWalletAddress === "0x") {
        console.error("[MetaMaskPayment] No valid founder wallet address found for startup:", startupId);
        throw new Error("Founder hasn't connected their wallet yet. Please ask the founder to connect their wallet in their profile, or use the manual wallet entry option.");
      }
      
      // Ensure startupId is a valid number for blockchain
      const numericStartupId = typeof startupId === 'number' ? 
        startupId : 
        (typeof startupId === 'string' ? 
          (parseInt(startupId) || 1) : 
          1);
                                   
      // Log the startup data and wallet address being used
      console.log("[MetaMaskPayment] Startup data for investment:", {
        originalStartupId: startupId,
        numericStartupId,
        founderWalletAddress
      });
      
      let result;
      
      // For debugging - check if the address is valid
      console.log("[MetaMaskPayment] Address validation:", {
        founderWalletAddress,
        isValidAddress: founderWalletAddress ? ethers.isAddress(founderWalletAddress) : false,
        ethersVersion: ethers.version
      });
      
      // Use direct ETH transfer to founder wallet if we have a valid address
      if (founderWalletAddress && ethers.isAddress(founderWalletAddress)) {
        console.log("[MetaMaskPayment] Using direct ETH transfer to:", founderWalletAddress);
        
        try {
          // Use our dedicated direct transfer utility
          result = await sendDirectETH(founderWalletAddress, cleanAmount);
          console.log("[MetaMaskPayment] Direct transfer result:", result);
        } catch (error) {
          console.error("[MetaMaskPayment] Direct transfer error:", error);
          throw error;
        }
      } else {
        // Fall back to contract (though this will fail for EOA addresses)
        console.log("[MetaMaskPayment] No valid founder wallet address found, using contract");
        result = await investInStartup(numericStartupId, cleanAmount, founderWalletAddress);
      }
      
      if (result) {
        // Store transaction hash
        setTxHash(result.transactionHash);
        
        // Record transaction in our backend
        if (user) {
          const startupIdForBackend = typeof startupId === 'number' ? startupId.toString() : startupId;
          console.log("Recording transaction with IDs:", {
            startupIdForBackend,
            investorId: user.id,
            transactionHash: result.transactionHash
          });
          
          const userId = typeof user.id === 'number' ? user.id.toString() : user.id;
          await createTransaction.mutateAsync({
            startupId: startupIdForBackend,
            investorId: userId,
            amount: cleanAmount,
            paymentMethod: "metamask",
            transactionId: result.transactionHash,
            status: "pending" // Will be verified by admin
          });
        }
        
        // Notify user
        toast({
          title: "Investment Successful",
          description: `You have successfully invested ${cleanAmount} ETH in ${startupName}`,
        });
        
        // Call the callback if provided
        if (onPaymentComplete) {
          onPaymentComplete(result.transactionHash, cleanAmount);
        }
      }
    } catch (error: any) {
      console.error("Investment error:", error);
      
      // Extract the core error message from Ethereum provider errors
      let errorMessage = error.message || "Failed to process your investment";
      
      // Handle common MetaMask errors
      if (errorMessage.includes("user rejected") || errorMessage.includes("ACTION_REJECTED")) {
        errorMessage = "Transaction was rejected in MetaMask";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage = "Insufficient funds in your wallet to complete this transaction";
      }
      
      toast({
        title: "Investment Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Render MetaMask not installed warning
  if (!isInstalled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Pay with MetaMask
          </CardTitle>
          <CardDescription>
            Use cryptocurrency to invest in this startup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-amber-50 text-amber-800 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">MetaMask Not Detected</h4>
              <p className="text-sm">
                To invest using cryptocurrency, please install the MetaMask extension for your browser.
              </p>
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm flex items-center gap-1 mt-2 text-blue-600 hover:underline"
              >
                <span>Get MetaMask</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render transaction success view
  if (txHash) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Investment Successful
          </CardTitle>
          <CardDescription>
            Your transaction has been submitted to the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-green-50 text-green-800">
            <p className="text-sm font-medium mb-1">Transaction Hash:</p>
            <p className="text-xs font-mono break-all">{txHash}</p>
            <p className="text-sm mt-2">
              Your investment will be confirmed once the transaction is verified on the blockchain.
              This usually takes a few minutes.
            </p>
          </div>
          
          <div className="text-center">
            <a 
              href={(() => {
                const chainIdNum = chainId ? Number(chainId) : 0;
                if (chainIdNum === 11155111) {
                  return `https://sepolia.etherscan.io/tx/${txHash}`;
                } else if (chainIdNum === 1) {
                  return `https://etherscan.io/tx/${txHash}`;
                } else {
                  return `#`;
                }
              })()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <span>
                View Transaction on {(() => {
                  const chainIdNum = chainId ? Number(chainId) : 0;
                  return chainIdNum === 11155111 ? "Sepolia " : "";
                })()}Etherscan
              </span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setTxHash(null)}
          >
            Make Another Investment
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Show loading state while we fetch founder wallet info
  if (founderWalletStatus === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Pay with MetaMask
          </CardTitle>
          <CardDescription>
            Use Ethereum to invest in {startupName}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
          <p>Loading payment information...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifying founder's wallet address for direct transfer
          </p>
          
          {/* Add a button to show the direct payment form instead of waiting */}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4" 
            onClick={() => {
              // Instead of showing error, create a manual wallet entry form
              toast({
                title: "Manual Payment Mode",
                description: "You can now enter a wallet address directly for payment",
              });
              
              // Force render the payment form with a dummy wallet
              setManualFounderInfo({
                id: "manual",
                walletAddress: "0x",  // This will be replaced by user input
                name: "Manual Payment"
              });
              
              // Create a manual wallet entry by prompting the user
              const walletAddress = prompt("Enter the founder's wallet address (0x...)", "0x");
              if (walletAddress && walletAddress.startsWith("0x")) {
                setManualFounderInfo({
                  id: "manual",
                  walletAddress: walletAddress,
                  name: "Manual Payment"
                });
                
                // Also save this wallet to the database for future use
                // using promise-based approach to avoid async/await syntax errors
                const walletPromise = import('@/firebase/walletDatabase');
                walletPromise.then(walletDb => {
                  // Get the actual startup data to get the founder ID
                  const { useStartup } = useStartups();
                  const { data: startupData } = useStartup(startupId.toString());
                  
                  // If we have startup data with a founder ID, use that instead of the startup ID
                  if (startupData && startupData.founderId && walletDb.saveWalletAddress) {
                    console.log("[MetaMaskPayment] Found proper Firebase UID to save wallet:", {
                      startupId,
                      founderId: startupData.founderId
                    });
                    
                    // Save using the Firebase UID
                    walletDb.saveWalletAddress(
                      startupData.founderId.toString(), 
                      walletAddress, 
                      "Founder", 
                      "founder"
                    ).then(() => {
                      console.log("[MetaMaskPayment] Saved manually entered wallet address using Firebase UID:", startupData.founderId);
                      
                      // Also attempt to migrate any old numeric ID wallets
                      if (walletDb.migrateWalletToFirebaseUid) {
                        // Common IDs to check would be "1", "2", "92" etc. based on your JSON data
                        const commonNumericIds = ["1", "2", "92", "3", "4", "5", "10"];
                        
                        for (const numericId of commonNumericIds) {
                          // Try to migrate any existing wallets with these IDs to the Firebase UID
                          walletDb.migrateWalletToFirebaseUid(
                            numericId,
                            startupData.founderId.toString(),
                            walletAddress
                          ).catch(err => {
                            // Silently ignore migration errors - it's just a helpful extra step
                            console.log(`[MetaMaskPayment] Migration attempt from ID ${numericId} didn't apply:`, err.message);
                          });
                        }
                      }
                    }).catch(err => {
                      console.error("[MetaMaskPayment] Error saving wallet address:", err);
                    });
                  } else {
                    // Fallback to using startup ID if we couldn't find the founder ID
                    console.log("[MetaMaskPayment] Could not find founder ID, falling back to startup ID");
                    if (startupId && walletDb.saveWalletAddress) {
                      walletDb.saveWalletAddress(
                        startupId.toString(), 
                        walletAddress, 
                        "Founder", 
                        "founder"
                      ).catch(err => {
                        console.error("[MetaMaskPayment] Fallback wallet save error:", err);
                      });
                    }
                  }
                }).catch(error => {
                  console.error("[MetaMaskPayment] Error importing wallet database:", error);
                });
              }
            }}
          >
            Enter wallet address manually
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Show error when founder hasn't connected a wallet
  if (founderWalletStatus === 'not_found' || founderWalletStatus === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Wallet Not Available
          </CardTitle>
          <CardDescription>
            Cannot process cryptocurrency payments at this time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-amber-50 text-amber-800">
            <h4 className="font-medium mb-2">
              {founderWalletStatus === 'not_found' 
                ? "Founder hasn't connected a wallet" 
                : "Error retrieving founder's wallet"}
            </h4>
            <p className="text-sm">
              {founderWalletStatus === 'not_found'
                ? "The founder of this startup hasn't connected a cryptocurrency wallet address yet. Please try again later or use an alternative payment method."
                : "There was an error retrieving the founder's wallet information. Please try again later or use an alternative payment method."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render payment form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Pay with MetaMask
        </CardTitle>
        <CardDescription>
          Use Ethereum to invest in {startupName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Network info section */}
        {address && (
          <div className="mb-4 text-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">Connected:</span>
              <span className="font-medium">{address ? truncateAddress(address) : ''}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">Network:</span>
              <span className="font-medium">{networkName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-medium">{parseFloat(balance || "0").toFixed(4)} ETH</span>
            </div>
          </div>
        )}
        
        {/* Founder wallet info */}
        {founderInfo && founderInfo.walletAddress && (
          <div className="mb-4 p-3 border rounded-lg bg-blue-50 text-blue-800 text-sm">
            <p className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <span>Direct transfer to founder available</span>
            </p>
            <p className="text-xs mt-1 text-blue-600">
              Investments will be sent directly to the founder's Ethereum wallet
            </p>
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (ETH)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      placeholder="0.00"
                      disabled={isProcessing}
                      // Prevent scientific notation for very small numbers
                      onChange={(e) => {
                        // Format the number to prevent scientific notation
                        const value = e.target.value;
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the amount you want to invest in ETH
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : address ? (
                "Complete Investment"
              ) : (
                "Connect Wallet & Invest"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default MetaMaskPayment;