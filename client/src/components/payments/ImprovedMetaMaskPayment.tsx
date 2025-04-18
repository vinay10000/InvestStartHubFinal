import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Wallet, AlertTriangle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/useWeb3";
import { useContractInteraction } from "@/hooks/useContractInteraction";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { sendDirectETH } from "@/lib/directTransfer";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { useStartups } from "@/hooks/useStartups";
import { useFounderWallet } from "@/hooks/useFounderWallet";
import { useWallet } from "@/hooks/useWallet";
import { Label as UILabel } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { saveWalletToStartup } from '../../firebase/walletDatabase';
import { Input } from "@/components/ui/input";
import { firestore } from "@/firebase/config";
import { doc, setDoc, serverTimestamp, collection } from "firebase/firestore";

interface ImprovedMetaMaskPaymentProps {
  startupId: string | number;
  startupName: string;
  onPaymentComplete?: (txHash: string, amount: string) => void;
}

const ImprovedMetaMaskPayment = ({ 
  startupId, 
  startupName,
  onPaymentComplete 
}: ImprovedMetaMaskPaymentProps) => {
  const { isInstalled, address, connect, isWalletConnected, balance, chainId, sendDirectETH } = useWeb3();
  const { investInStartup } = useContractInteraction();
  const { createTransaction } = useTransactions();
  const { user } = useAuth();
  const { toast } = useToast();
  const { useStartup } = useStartups();
  
  // Get founder's wallet information from multiple sources
  const { data: startupData } = useStartup(startupId.toString());
  
  // Try from the useWallet hook first
  const { walletAddress: founderWalletAddress } = useWallet(startupData?.founderId);
  
  // Also check if the startup data has a direct wallet address field (handle various field names)
  const directFounderWallet = startupData?.founderWalletAddress || 
                             (startupData as any)?.founderWalletAddress || 
                             (startupData as any)?.walletAddress;
                             
  // For wallet discovery logging only
  console.log("Wallet Discovery - Founder wallet sources:", {
    startupId,
    startupFounderId: startupData?.founderId,
    founderWalletAddress,
    directFounderWallet,
    possibleFounderWallet: founderWalletAddress || directFounderWallet || null
  });
  
  // Get the current user's wallet - ensure userId is a string or undefined
  const { walletAddress, isLoading: isUserWalletLoading } = useWallet(user?.id?.toString());
  
  // Also check sessionStorage which is updated by ProtectedRoute
  const sessionWalletAddress = sessionStorage.getItem('wallet_address');
  // Use either the hook-provided wallet or the one from sessionStorage
  const effectiveWalletAddress = walletAddress || sessionWalletAddress;
  
  // Debug logs to understand wallet discovery
  console.log("Wallet Discovery in ImprovedMetaMaskPayment:", {
    hookProvidedWallet: walletAddress,
    sessionStorageWallet: sessionWalletAddress,
    effectiveWalletAddress,
    founderWalletAddress,
    startupFounderId: startupData?.founderId,
    isMetaMaskInstalled: isInstalled,
    isMetaMaskConnected: isWalletConnected(),
    currentMetaMaskAddress: address
  });
  
  // State to track if we need to prompt for MetaMask connection
  const [needsMetaMaskConnection, setNeedsMetaMaskConnection] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string>("Unknown Network");
  const [amount, setAmount] = useState<string>("0.1"); // Default investment amount
  const [transactionProgress, setTransactionProgress] = useState<number>(0);
  
  // We no longer need manual wallet input since we collect it during signup
  const [manualFounderWallet, setManualFounderWallet] = useState<string | null>(null);
  const [manualFounderInfo, setManualFounderInfo] = useState<any | null>(null);
  
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
  
  // Update network name when chainId changes
  useEffect(() => {
    setNetworkName(getNetworkName(chainId));
  }, [chainId]);
  
  // Update the useEffect for wallet connection state
  useEffect(() => {
    const attemptAutoConnect = async () => {
      // Skip if MetaMask is not installed
      if (!isInstalled) {
        console.log("[ImprovedMetaMaskPayment] MetaMask not installed");
        return;
      }

      // If we already have a connected address, we're done
      if (address) {
        console.log("[ImprovedMetaMaskPayment] Already connected to:", address);
        return;
      }

      try {
        // Check if we're already connected in MetaMask
        const metaMaskConnected = await isWalletConnected();
        
        // Check localStorage for wallet connection status
        const localStorageWalletStatus = localStorage.getItem('wallet_connected');
        const isStoredAsConnected = localStorageWalletStatus === 'true';

        console.log("[ImprovedMetaMaskPayment] Connection status:", {
          metaMaskConnected,
          localStorageWalletStatus,
          effectiveWalletAddress
        });

        // If we have a stored wallet or MetaMask reports connected, try to connect
        if (metaMaskConnected || isStoredAsConnected || effectiveWalletAddress) {
          console.log("[ImprovedMetaMaskPayment] Attempting to auto-connect wallet");
          await connect();
        }
      } catch (error) {
        console.error("[ImprovedMetaMaskPayment] Error during auto-connect:", error);
      }
    };

    attemptAutoConnect();
  }, [isInstalled, address, connect, isWalletConnected, effectiveWalletAddress]);
  
  // Handle investment process
  const handleInvest = async () => {
    // If we already have an address, we can proceed directly
    if (!address) {
      // Only try to connect if not already connected
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

    // Validate investment amount
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid investment amount",
        variant: "destructive"
      });
      return;
    }

    // Check if amount exceeds balance
    const numericAmount = parseFloat(amount);
    const userBalance = parseFloat(balance || "0");
    if (numericAmount > userBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${userBalance.toFixed(4)} ETH available`,
        variant: "destructive"
      });
      return;
    }

    // Get the most reliable founder wallet address - using the one from earlier in the component
    
    console.log("Investment - using founder wallet:", effectiveFounderWallet, {
      founderWalletAddress,
      directFounderWallet,
      manualFounderWallet
    });
    
    // Check if founder wallet is available
    if (!effectiveFounderWallet) {
      toast({
        title: "Founder Wallet Not Found",
        description: "The startup founder hasn't connected their wallet yet. Please try again later when the founder has setup their wallet in their profile.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setTransactionProgress(10);

    try {
      // Clean the amount string for transaction
      const cleanAmount = numericAmount.toFixed(Math.min(18, amount.includes('.') ? amount.split('.')[1].length : 0));
      
      // Show transaction preparation progress
      setTransactionProgress(30);
      
      // Process the transaction using direct ETH transfer
      const result = await sendDirectETH(effectiveFounderWallet, cleanAmount);
      
      // Transaction sent
      setTransactionProgress(70);
      
      if (result && user) {
        // Store transaction hash
        setTxHash(result.transactionHash);
        
        // Transaction confirmed
        setTransactionProgress(90);
        
        // Create a unique transaction ID
        const transactionId = result.transactionHash;
        
        // Create transaction document in Firestore
        const transactionData = {
          startupId: startupId.toString(),
          investorId: user.id.toString(),
          founderId: startupData?.founderId,
          amount: cleanAmount,
          amountInEth: cleanAmount,
          paymentMethod: "metamask",
          transactionHash: result.transactionHash,
          status: "completed",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          fromAddress: address,
          toAddress: effectiveFounderWallet,
          networkName: networkName,
          startupName: startupName
        };

        // Add transaction to Firestore
        await setDoc(doc(firestore, "transactions", transactionId), transactionData);

        // Update startup's total investment
        const startupRef = doc(firestore, "startups", startupId.toString());
        const startupTransactionsRef = collection(startupRef, "transactions");
        await setDoc(doc(startupTransactionsRef, transactionId), transactionData);

        // Update user's investments
        const userRef = doc(firestore, "users", user.id.toString());
        const userTransactionsRef = collection(userRef, "transactions");
        await setDoc(doc(userTransactionsRef, transactionId), transactionData);
        
        // Complete transaction
        setTransactionProgress(100);
        
        // Notify user
        toast({
          title: "Investment Successful",
          description: `You have successfully invested ${cleanAmount} ETH in ${startupName}`,
        });
        
        // Call completion callback
        if (onPaymentComplete) {
          onPaymentComplete(result.transactionHash, cleanAmount);
        }
      }
    } catch (error: any) {
      console.error("Investment error:", error);
      
      // Reset progress
      setTransactionProgress(0);
      
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
  
  // Show loading state while fetching wallet info
  if (isUserWalletLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading wallet information...</span>
      </div>
    );
  }
  
  // If the user has no wallet info at all, show the wallet setup UI
  if (!effectiveWalletAddress && user) {
    console.log("No wallet information found at all, showing connect wallet UI");
    // Attempting to auto-connect wallet if it's available through MetaMask
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Your Wallet
          </CardTitle>
          <CardDescription>
            You need to connect a wallet to continue with your investment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Wallet Required</AlertTitle>
            <AlertDescription>
              To invest in a startup, you need to connect an Ethereum wallet. This is required for secure cryptocurrency transactions.
            </AlertDescription>
          </Alert>
          
          {/* Add a button to try connecting MetaMask directly */}
          <Button 
            variant="outline" 
            className="w-full mb-2"
            onClick={async () => {
              try {
                // Attempt to connect MetaMask directly
                console.log("Attempting to connect MetaMask directly");
                const connected = await connect();
                
                if (connected) {
                  console.log("Successfully connected MetaMask");
                  toast({
                    title: "Wallet Connected",
                    description: "Your MetaMask wallet has been connected successfully",
                  });
                } else {
                  toast({
                    title: "Connection Failed",
                    description: "Please install MetaMask or allow the connection request",
                    variant: "destructive"
                  });
                }
              } catch (error) {
                console.error("Error connecting MetaMask directly:", error);
                toast({
                  title: "Connection Error",
                  description: "Could not connect to MetaMask. Please try setup page instead.",
                  variant: "destructive"
                });
              }
            }}
          >
            Connect MetaMask Directly
          </Button>
          
          <Button 
            variant="default" 
            className="w-full"
            onClick={() => {
              // Store current URL to redirect back after wallet setup
              const currentPath = window.location.pathname;
              const currentSearch = window.location.search;
              localStorage.setItem('wallet_redirect', currentPath + currentSearch);
              window.location.href = "/wallet-setup?redirect=" + encodeURIComponent(currentPath + currentSearch);
            }}
          >
            Go to Wallet Setup
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // If we have a wallet in the database or session but it's not connected in the browser yet
  if (effectiveWalletAddress && !address && !isWalletConnected()) {
    console.log("Wallet found in database/session but not connected in browser");
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Your Wallet
          </CardTitle>
          <CardDescription>
            Your wallet is already registered but needs to be connected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 border rounded-lg bg-blue-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Wallet Connected to Your Account</span>
              <span className="text-sm text-green-600">✓ Verified</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm">Address</span>
              <span className="text-sm font-mono">{effectiveWalletAddress ? truncateAddress(effectiveWalletAddress) : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm">Status</span>
              <span className="text-sm">Permanent</span>
            </div>
          </div>
          
          <Button 
            variant="default" 
            className="w-full"
            onClick={async () => {
              try {
                console.log("Attempting to connect MetaMask with existing wallet...");
                const connected = await connect();
                
                if (connected) {
                  console.log("Successfully connected MetaMask with existing wallet!");
                  toast({
                    title: "MetaMask Connected",
                    description: "Your wallet is now ready to make transactions",
                  });
                  // Force a refresh of the component
                  setTimeout(() => window.location.reload(), 1000);
                } else {
                  toast({
                    title: "Connection Failed",
                    description: "Please ensure MetaMask is installed and unlocked",
                    variant: "destructive"
                  });
                }
              } catch (error) {
                console.error("Error connecting MetaMask:", error);
                toast({
                  title: "Connection Error",
                  description: "Could not connect to MetaMask. Please try again.",
                  variant: "destructive"
                });
              }
            }}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }
  
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
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>MetaMask Not Installed</AlertTitle>
            <AlertDescription>
              You need to install the MetaMask browser extension to make cryptocurrency payments.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => window.open("https://metamask.io/download/", "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Install MetaMask
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If the MetaMask wallet is not connected but we have a wallet in database, prompt to connect
  if (needsMetaMaskConnection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect MetaMask
          </CardTitle>
          <CardDescription>
            Connect your MetaMask wallet to proceed with the investment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 border rounded-lg bg-blue-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Wallet Connected to Your Account</span>
              <span className="text-sm text-green-600">✓ Verified</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm">Address</span>
              <span className="text-sm font-mono">{effectiveWalletAddress ? truncateAddress(effectiveWalletAddress) : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm">Status</span>
              <span className="text-sm">Permanent</span>
            </div>
          </div>
          
          <Alert className="bg-yellow-50 border-yellow-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Browser Extension Not Connected</AlertTitle>
            <AlertDescription>
              Your wallet is registered in the platform but you need to connect the MetaMask browser extension to proceed with the investment.
            </AlertDescription>
          </Alert>
          
          <Button 
            className="w-full" 
            onClick={async () => {
              try {
                console.log("Trying to connect MetaMask extension...");
                const connected = await connect();
                
                if (connected) {
                  console.log("Successfully connected MetaMask extension!");
                  toast({
                    title: "MetaMask Connected",
                    description: "Your wallet is now ready to make transactions"
                  });
                } else {
                  toast({
                    title: "Connection Failed",
                    description: "Please ensure MetaMask is installed and unlocked",
                    variant: "destructive"
                  });
                }
              } catch (error) {
                console.error("Error connecting MetaMask:", error);
                toast({
                  title: "Connection Error",
                  description: "Could not connect to MetaMask. Please try again.",
                  variant: "destructive"
                });
              }
            }}
          >
            Connect MetaMask Browser Extension
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Use the wallet info passed from props or provided by useFounderWallet hook
  // Combine all possible wallet sources
  const effectiveFounderWallet = founderWalletAddress || directFounderWallet || manualFounderWallet;
  const effectiveFounderInfo = {
    name: startupData?.name || "Founder",
    walletAddress: effectiveFounderWallet
  };
  const effectiveHasWallet = !!effectiveFounderWallet;
  
  // Function to validate Ethereum address
  const isValidEthAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };
  
  // We no longer need manual wallet entry since we collect wallet addresses during signup
  
  // Render no founder wallet warning
  if (!effectiveHasWallet) {
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
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Founder Wallet Not Found</AlertTitle>
            <AlertDescription>
              The startup founder hasn't connected their wallet yet.
              Please try again later when the founder has setup their wallet in their profile.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // Render transaction success state
  if (txHash) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Investment Successful
          </CardTitle>
          <CardDescription>
            Your investment has been processed successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-green-50 text-green-800">
            <p className="text-sm mb-2">
              Transaction Hash: <span className="font-mono">{txHash ? truncateAddress(txHash) : ''}</span>
            </p>
            <p className="text-sm">
              Your transaction will be verified on the blockchain. This process may take a few minutes.
            </p>
          </div>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => window.open(`https://etherscan.io/tx/${txHash}`, "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Etherscan
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
          Invest in {startupName} using cryptocurrency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Status Section */}
        <div className="p-3 border rounded-lg bg-slate-50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Your Wallet</span>
            <span className="text-sm font-mono bg-green-100 text-green-800 px-2 py-0.5 rounded">
              {isWalletConnected() && address ? truncateAddress(address) : "Not Connected"}
            </span>
          </div>
          {isWalletConnected() && address ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm">Balance</span>
                <span className="text-sm font-medium">{parseFloat(balance || "0").toFixed(4)} ETH</span>
              </div>
            </>
          ) : (
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={connect}
              >
                Connect MetaMask
              </Button>
            </div>
          )}
        </div>
        
        {/* Recipient Info */}
        <div className="p-3 border rounded-lg bg-slate-50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Recipient</span>
            <span className="text-sm">{effectiveFounderInfo?.name || startupName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Wallet</span>
            <span className="text-sm font-mono truncate max-w-[180px]">
              {truncateAddress(effectiveFounderWallet || "")}
            </span>
          </div>
        </div>
        
        {/* Amount Input */}
        <div className="space-y-2">
          <UILabel htmlFor="amount">Investment Amount (ETH)</UILabel>
          <div className="relative">
            <input
              id="amount"
              type="number"
              step="0.001"
              min="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border rounded-md"
              disabled={isProcessing}
              placeholder="0.1"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              ETH
            </div>
          </div>
          <p className="text-sm text-gray-500">
            {amount && !isNaN(parseFloat(amount)) ? 
              `Approximately ${formatCurrency(parseFloat(amount) * 3500)} USD` : 
              "Enter an amount in ETH"
            }
          </p>
        </div>
        
        {/* Progress Bar (only shown during processing) */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Transaction Progress</span>
              <span className="text-sm">{transactionProgress}%</span>
            </div>
            <Progress value={transactionProgress} />
            <p className="text-xs text-center text-gray-500">
              {transactionProgress < 30 && "Preparing transaction..."}
              {transactionProgress >= 30 && transactionProgress < 70 && "Waiting for confirmation..."}
              {transactionProgress >= 70 && "Processing payment..."}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleInvest}
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
      </CardFooter>
    </Card>
  );
};

export default ImprovedMetaMaskPayment;