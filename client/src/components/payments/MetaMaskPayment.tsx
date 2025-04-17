import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wallet, AlertTriangle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/useWeb3";
import { useContractInteraction } from "@/hooks/useContractInteraction";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { useStartups } from "@/hooks/useStartups";

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
  
  // Fetch the complete startup data to access founder details
  const { data: startupData } = useStartup(startupId ? startupId.toString() : "");
  
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
      
      // Get founder wallet address from startup data if available
      const founderWalletAddress = startupData?.startup?.walletAddress || 
                                   startupData?.walletAddress || 
                                   startupData?.founderWalletAddress || 
                                   startupData?.founder?.walletAddress;
                                   
      // Log the startup data and wallet address being used
      console.log("[MetaMaskPayment] Startup data for investment:", {
        startupId,
        startupData,
        founderWalletAddress
      });
      
      // Invest using the contract with real startup ID
      const result = await investInStartup(startupId, cleanAmount);
      
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
              <span className="font-medium">{truncateAddress(address)}</span>
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