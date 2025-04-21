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
  startupId: string | number;
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
  
  // Use enhanced dedicated hook to fetch founder wallet information
  const { 
    founderWallet, 
    founderInfo: hookFounderInfo, 
    isLoading: isWalletLoading, 
    error: walletError,
    hasWallet,
    diagnosticResults: walletDiagnostics
  } = useFounderWallet(startupId);
  
  // Log extra diagnostic information for debugging
  console.log("Detailed wallet discovery status:", {
    startupId,
    startupIdType: typeof startupId,
    founderWallet,
    isWalletLoading,
    walletError,
    hasWallet,
    hookFounderInfoExists: !!hookFounderInfo,
    diagnosticResultsExists: !!walletDiagnostics,
    sessionStorageWallet: sessionStorage.getItem(`founder_wallet_${startupId}`)
  });
  
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
          
          // Save this wallet to MongoDB
          if (startupDetailData?.founderId) {
            console.log("[MetaMaskPayment] Retrieved startup data for wallet saving:", {
              startupId,
              startupName,
              founderId: startupDetailData.founderId
            });
            
            // Use the API endpoint to save the wallet address
            fetch('/api/user/wallet/connect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: startupDetailData.founderId.toString(),
                walletAddress,
                userType: 'founder',
                isPermanent: true
              })
            })
            .then(res => res.json())
            .then(data => {
              console.log("[MetaMaskPayment] Saved manually entered wallet address to MongoDB:", data);
              
              // Also save to startup record
              return fetch('/api/wallets/connect', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  startupId: startupId.toString(),
                  founderId: startupDetailData.founderId.toString(),
                  walletAddress
                })
              });
            })
            .then(() => {
              console.log("[MetaMaskPayment] Saved wallet association for startup:", startupId);
              
              // Store the wallet in session storage as well for faster access
              try {
                sessionStorage.setItem(`founder_wallet_${startupId}`, walletAddress);
              } catch (err) {
                console.warn("[MetaMaskPayment] Could not store wallet in session storage:", err);
              }
            })
            .catch(err => {
              console.error("[MetaMaskPayment] Error saving wallet address to MongoDB:", err);
            });
          } else {
            // Fallback to using startup ID if we couldn't find the founder ID
            console.log("[MetaMaskPayment] Could not find founder ID, falling back to startup ID");
            if (startupId) {
              // Save using the startupId instead
              fetch('/api/wallets/connect', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  startupId: startupId.toString(),
                  walletAddress,
                  isPermanent: true
                })
              })
              .catch(err => {
                console.error("[MetaMaskPayment] Fallback wallet save error:", err);
              });
            }
          }
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
  }, [isWalletLoading, toast, startupId, startupDetailData, startupName]);
  
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
    if ((startupDetailData as any)?.founderWalletAddress) {
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
    
    console.log('Wallet Discovery in MetaMaskPayment:', {
      hookProvidedWallet: founderWallet,
      sessionStorageWallet: sessionWallet,
      effectiveWalletAddress: founderInfo?.walletAddress || 
                             startupData?.founderWalletAddress || 
                             sessionWallet || null,
      hookFounderWallet: founderInfo?.walletAddress,
      startupFounderId: startupData?.founderId,
      startupFounderSameId: startupData?.sameId,
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
      else if (sessionWallet && 
               sessionWallet !== "0x" && 
               sessionWallet.startsWith("0x")) {
        founderWalletAddress = sessionWallet;
        console.log("[MetaMaskPayment] Using wallet from session storage:", founderWalletAddress);
        
        // Save this wallet to the database for future use
        if (startupDetailData?.founderId && founderWalletAddress) {
          try {
            // Use the API endpoint to save the wallet address for the user
            await fetch('/api/user/wallet/connect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: startupDetailData.founderId.toString(),
                walletAddress: founderWalletAddress,
                userType: 'founder',
                isPermanent: true
              })
            });
            
            // Also save to startup record
            await fetch('/api/wallets/connect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                startupId: startupId.toString(),
                founderId: startupDetailData.founderId.toString(),
                walletAddress: founderWalletAddress
              })
            });
            
            console.log("[MetaMaskPayment] Saved session wallet to MongoDB database:", {
              founderId: startupDetailData.founderId,
              startupId,
              walletAddress: founderWalletAddress
            });
          } catch (err) {
            console.error("[MetaMaskPayment] Error saving session wallet:", err);
          }
        }
      }
      // 5. Last resort: try to fetch from MongoDB API endpoint
      else {
        console.log("[MetaMaskPayment] Attempting database lookup for wallet...");
        
        try {
          // Use MongoDB API for wallet lookup
          console.log("[MetaMaskPayment] Running wallet diagnostics for startup ID:", startupId);
          const founderId = startupDetailData?.founderId;
          
          // Try to get wallet by startup ID first
          const walletResult = await fetch(`/api/wallets/startup/${startupId}`)
            .then(res => {
              if (!res.ok) {
                throw new Error(`Startup wallet lookup failed: ${res.status}`);
              }
              return res.json();
            })
            .then(data => data.walletAddress)
            .catch(err => {
              console.error("[MetaMaskPayment] Error fetching startup wallet from MongoDB API:", err);
              return null;
            });
            
          if (walletResult) {
            founderWalletAddress = walletResult;
            console.log("[MetaMaskPayment] Found wallet through startup lookup:", founderWalletAddress);
            
            // Store in session storage for future use
            try {
              sessionStorage.setItem(`founder_wallet_${startupId}`, founderWalletAddress);
              console.log("[MetaMaskPayment] Saved wallet to session storage");
            } catch (err) {
              console.warn("[MetaMaskPayment] Failed to save to session storage:", err);
            }
          }
          // If not found by startup ID and we have founderId, try by founderId
          else if (founderId) {
            const founderWallet = await fetch(`/api/wallets/user/${founderId}`)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`Founder wallet lookup failed: ${res.status}`);
                }
                return res.json();
              })
              .then(data => data.walletAddress)
              .catch(err => {
                console.error("[MetaMaskPayment] Error fetching founder wallet from MongoDB API:", err);
                return null;
              });
              
            if (founderWallet) {
              founderWalletAddress = founderWallet;
              console.log("[MetaMaskPayment] Found wallet through founder lookup:", founderWalletAddress);
              
              // Store in session storage for future use
              try {
                sessionStorage.setItem(`founder_wallet_${startupId}`, founderWalletAddress);
                console.log("[MetaMaskPayment] Saved direct user wallet to session storage");
                
                // Also associate this wallet with the startup
                await fetch('/api/wallets/connect', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    startupId: startupId.toString(),
                    founderId: founderId.toString(),
                    walletAddress: founderWalletAddress
                  })
                });
              } catch (err) {
                console.warn("[MetaMaskPayment] Failed to save to session storage:", err);
              }
            }
          }
        } catch (err) {
          console.error("[MetaMaskPayment] Error getting wallet from database:", err);
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
            className="mt-4" 
            onClick={() => {
              // Create a mock wallet address to trigger the manual entry prompt
              setManualFounderInfo({
                id: "manual",
                walletAddress: null,
                name: "Manual Payment"
              });
            }}
          >
            Enter wallet address manually
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Show wallet not found error
  if (founderWalletStatus === 'not_found' || founderWalletStatus === 'error') {
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
          <div className="p-4 border rounded-lg bg-amber-50 text-amber-800 flex items-start gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Founder Wallet Not Found</h4>
              <p className="text-sm">
                We couldn't find the founder's wallet address for this startup. Please enter it manually to proceed with the payment.
              </p>
            </div>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => {
              // Get wallet address from user via prompt
              const walletAddress = prompt(
                "Enter the founder's wallet address (0x...) to proceed with payment", 
                "0x"
              );
              
              if (walletAddress && walletAddress.startsWith("0x") && walletAddress.length >= 42) {
                setManualFounderInfo({
                  id: "manual",
                  walletAddress: walletAddress,
                  name: "Manual Payment"
                });
                
                // Save this wallet address to the database for future use
                if (startupDetailData?.founderId) {
                  fetch('/api/user/wallet/connect', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      userId: startupDetailData.founderId.toString(),
                      walletAddress,
                      userType: 'founder',
                      isPermanent: true
                    })
                  }).catch(err => {
                    console.error("[MetaMaskPayment] Error saving wallet address:", err);
                  });
                }
                
                toast({
                  title: "Wallet Address Entered",
                  description: "You can now proceed with the payment to the provided address.",
                });
              } else if (walletAddress) {
                toast({
                  title: "Invalid Wallet Address",
                  description: "Please enter a valid Ethereum wallet address starting with 0x",
                  variant: "destructive"
                });
              }
            }}
          >
            Enter Wallet Address Manually
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Render main payment form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Pay with MetaMask
        </CardTitle>
        <CardDescription>
          Use cryptocurrency to invest in {startupName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!address ? (
          <div className="text-center py-3">
            <Button 
              onClick={connect} 
              className="mb-4"
            >
              Connect MetaMask Wallet
            </Button>
            <p className="text-sm text-muted-foreground">
              Connect your MetaMask wallet to start the investment process.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col space-y-1.5 mb-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Your Wallet</div>
                <div className="text-sm font-medium">{balance ? `${parseFloat(balance).toFixed(4)} ETH` : '0 ETH'}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{truncateAddress(address)}</div>
                <div className="text-xs text-muted-foreground">{networkName}</div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Amount (ETH)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0.1" 
                          {...field} 
                          disabled={isProcessing}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the amount of Ethereum you want to invest
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="text-sm text-muted-foreground mb-4">
                  <p className="font-medium mb-1">Payment will be sent to:</p>
                  <p className="font-mono text-xs break-all">
                    {(() => {
                      // Get the wallet address in order of priority
                      const walletAddress = founderInfo?.walletAddress || 
                                          (startupDetailData as any)?.founderWalletAddress || 
                                          sessionWallet;
                      return walletAddress ? truncateAddress(walletAddress, 12, 12) : "Loading wallet address...";
                    })()}
                  </p>
                </div>
                
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
                  ) : (
                    "Invest Now"
                  )}
                </Button>
              </form>
            </Form>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MetaMaskPayment;