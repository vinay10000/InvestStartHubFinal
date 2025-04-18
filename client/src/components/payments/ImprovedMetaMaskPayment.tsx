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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface ImprovedMetaMaskPaymentProps {
  startupId: number;
  startupName: string;
  onPaymentComplete?: (txHash: string, amount: string) => void;
}

const ImprovedMetaMaskPayment = ({ 
  startupId, 
  startupName,
  onPaymentComplete 
}: ImprovedMetaMaskPaymentProps) => {
  const { isInstalled, address, connect, isWalletConnected, balance, chainId } = useWeb3();
  const { investInStartup } = useContractInteraction();
  const { createTransaction } = useTransactions();
  const { user } = useAuth();
  const { toast } = useToast();
  const { useStartup } = useStartups();
  
  // Get founder's wallet information
  const { founderWallet, founderInfo, isLoading: isWalletLoading, hasWallet } = useFounderWallet(startupId);
  
  // Get the current user's wallet - ensure userId is a string or undefined
  const { walletAddress, isLoading: isUserWalletLoading } = useWallet(user?.id?.toString());
  
  // Also check sessionStorage which is updated by ProtectedRoute
  const sessionWalletAddress = sessionStorage.getItem('wallet_address');
  // Use either the hook-provided wallet or the one from sessionStorage
  const effectiveWalletAddress = walletAddress || sessionWalletAddress;
  
  // State to track if we need to prompt for MetaMask connection
  const [needsMetaMaskConnection, setNeedsMetaMaskConnection] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [networkName, setNetworkName] = useState<string>("Unknown Network");
  const [amount, setAmount] = useState<string>("0.1"); // Default investment amount
  const [transactionProgress, setTransactionProgress] = useState<number>(0);
  
  // State for manual wallet address entry
  const [manualWalletAddress, setManualWalletAddress] = useState<string>("");
  const [useManualAddress, setUseManualAddress] = useState<boolean>(false);
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
  
  // Auto-connect MetaMask when the component loads if user has a wallet
  useEffect(() => {
    const attemptAutoConnect = async () => {
      // Skip if we have no wallet in database or MetaMask is not installed
      if (!effectiveWalletAddress || !isInstalled) {
        setNeedsMetaMaskConnection(false);
        return;
      }

      // Check if we're already connected
      if (isWalletConnected() && address) {
        console.log("MetaMask already connected:", address);
        setNeedsMetaMaskConnection(false);
        return;
      }
      
      console.log("Wallet found in database but not connected in browser:", effectiveWalletAddress);
      
      try {
        // Check silently first if MetaMask is unlocked and has accounts
        let accounts = [];
        try {
          if (window.ethereum) {
            accounts = await window.ethereum.request({ method: 'eth_accounts' });
          }
        } catch (err) {
          console.log("Error checking unlocked accounts:", err);
        }
        
        // If accounts already available, we're good (the connect function will use them)
        if (accounts && accounts.length > 0) {
          console.log("MetaMask is unlocked with accounts:", accounts);
          
          // Attempt to auto-connect with MetaMask
          console.log("Attempting to auto-connect to unlocked MetaMask...");
          const connected = await connect();
          
          if (connected) {
            console.log("Auto-connection successful!");
            setNeedsMetaMaskConnection(false);
            
            // Check if account matches the database
            if (address && effectiveWalletAddress && address.toLowerCase() !== effectiveWalletAddress.toLowerCase()) {
              console.warn("Connected account doesn't match database wallet", {
                connectedAccount: address,
                databaseWallet: effectiveWalletAddress
              });
              
              toast({
                title: "Wallet Account Mismatch",
                description: "The connected MetaMask account is different from your registered wallet. Please switch to the correct account.",
                variant: "destructive"
              });
            }
          } else {
            console.log("Auto-connection failed despite unlocked accounts, showing connection prompt");
            setNeedsMetaMaskConnection(true);
          }
        } else {
          // No unlocked accounts, we'll need to prompt the user
          console.log("MetaMask is installed but locked or no accounts, showing connection prompt");
          setNeedsMetaMaskConnection(true);
        }
      } catch (error) {
        console.error("Error during auto-connect attempt:", error);
        setNeedsMetaMaskConnection(true);
      }
    };
    
    // Run the auto-connect attempt
    attemptAutoConnect();
  }, [effectiveWalletAddress, isWalletConnected, connect, isInstalled, address, toast]);
  
  // Handle investment process
  const handleInvest = async () => {
    // Check if we need to connect MetaMask or we can proceed directly
    if (!address) {
      try {
        // First check if the user already has a wallet in database
        if (walletAddress) {
          console.log("User has a wallet in database:", walletAddress);
          
          // Try to auto-connect with wallet in database
          console.log("Auto-connecting MetaMask...");
          const connected = await connect();
          
          if (!connected) {
            toast({
              title: "Wallet Connection Required",
              description: "Please connect your MetaMask browser extension to proceed with the investment",
              variant: "destructive"
            });
            return;
          }
        } else {
          // No wallet in database, regular connect flow
          const connected = await connect();
          if (!connected) {
            toast({
              title: "Wallet Connection Required",
              description: "Please connect your MetaMask wallet to proceed with the investment",
              variant: "destructive"
            });
            return;
          }
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
    
    // Check if founder wallet is available
    if (!effectiveFounderWallet) {
      toast({
        title: "Founder Wallet Not Found",
        description: "The startup founder has not connected their wallet yet",
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
      if (!effectiveFounderWallet) {
        throw new Error("Founder wallet address is missing");
      }
      const result = await sendDirectETH(effectiveFounderWallet, cleanAmount);
      
      // Transaction sent
      setTransactionProgress(70);
      
      if (result) {
        // Store transaction hash
        setTxHash(result.transactionHash);
        
        // Transaction confirmed
        setTransactionProgress(90);
        
        // Record transaction in backend
        if (user) {
          await createTransaction.mutateAsync({
            startupId: startupId.toString(),
            investorId: user.id.toString(),
            amount: cleanAmount,
            paymentMethod: "metamask",
            transactionId: result.transactionHash,
            status: "pending" // Will be verified by admin
          });
        }
        
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
  
  // Render loading state while fetching wallet info
  if (isWalletLoading || isUserWalletLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Finding Wallet Information</CardTitle>
          <CardDescription>
            Please wait while we locate the necessary wallet addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Check if user has a wallet connected in the database
  if (!walletAddress && user) {
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
              <span className="text-sm font-mono">{walletAddress ? truncateAddress(walletAddress) : 'N/A'}</span>
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
  const effectiveFounderWallet = founderWallet;
  const effectiveFounderInfo = founderInfo;
  const effectiveHasWallet = !!effectiveFounderWallet;
  
  // Function to validate Ethereum address
  const isValidEthAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };
  
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
              Please try again later when the founder has setup their wallet.
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
              {truncateAddress(address || "")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Balance</span>
            <span className="text-sm font-medium">{parseFloat(balance || "0").toFixed(4)} ETH</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm">Network</span>
            <span className="text-sm">{networkName}</span>
          </div>
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
          <Label htmlFor="amount">Investment Amount (ETH)</Label>
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
          disabled={isProcessing}
          onClick={handleInvest}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Invest ${amount} ETH Now`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ImprovedMetaMaskPayment;