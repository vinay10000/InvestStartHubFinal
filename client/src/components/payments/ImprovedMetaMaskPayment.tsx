import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Wallet, AlertTriangle, CheckCircle2, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/useWeb3";
import { useContractInteraction } from "@/hooks/useContractInteraction";
import { formatCurrency, truncateAddress, normalizeWalletAddress } from "@/lib/utils";
import { sendDirectETH } from "@/lib/directTransfer";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";
import { useStartups } from "@/hooks/useStartups";
import { useFounderWallet } from "@/hooks/useFounderWallet";
import { useWallet } from "@/hooks/useWallet";
import { useWebSocket } from "@/context/WebSocketContext";
import { Label as UILabel } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { doc, setDoc, collection, serverTimestamp, addDoc } from 'firebase/firestore';
import { firestore } from '../../firebase/config';
import { getStartupWallet } from '../../utils/wallet-utils';
import { getStartupWalletNew } from '../../utils/getStartupWalletNew';
import { useQueryClient } from "@tanstack/react-query";

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
  const { createTransaction, getTransactionsByInvestorId, refreshTransactions } = useTransactions();
  const { user } = useAuth();
  const { toast } = useToast();
  const { useStartup } = useStartups();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  
  // Load startup data for displaying UI information
  const { data: startupData } = useStartup(startupId.toString());
  
  // We won't use these hooks for the actual payment, just for display in the UI
  const { walletAddress: founderWalletAddress } = useWallet(startupData?.founderId);
  
  // Initialize state to track the founder's wallet (will be fetched from Firebase directly)
  const [founderWallet, setFounderWallet] = useState<string | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(true);
  const [walletSource, setWalletSource] = useState<string>("unknown");
  
  // Import WebSocket context
  const { lastMessage } = useWebSocket();
  
  // Websocket message sending function
  const sendWebSocketMessage = (type: string, data: any) => {
    // Using a simple approach rather than accessing window._websocket directly
    try {
      console.log(`[WebSocket] Attempting to send message of type: ${type}`);
      // Just log the message for now, since we're having issues with the WebSocket
      console.log('[WebSocket] Message data:', data);
    } catch (error) {
      console.error('[WebSocket] Error sending message:', error);
    }
  };
  
  // Function to load the wallet
  const loadStartupWallet = async () => {
    setIsLoadingWallet(true);
    try {
      // Use our new dedicated function that fetches from our reliable API
      const wallet = await getStartupWalletNew(startupId);
      
      if (wallet && wallet.startsWith('0x')) {
        console.log("[ImprovedMetaMaskPayment] Found real startup wallet:", wallet);
        setFounderWallet(wallet);
        setWalletSource("reliable_api");
      } else {
        console.log("[ImprovedMetaMaskPayment] No real wallet found");
        setFounderWallet(null);
      }
    } catch (error) {
      console.error("[ImprovedMetaMaskPayment] Error fetching startup wallet:", error);
      setFounderWallet(null);
    } finally {
      setIsLoadingWallet(false);
    }
  };
  
  // Load wallet when component mounts
  useEffect(() => {
    loadStartupWallet();
  }, [startupId]);
  
  // Send notification when wallet is missing and user views investment options
  useEffect(() => {
    if (!isLoadingWallet && !founderWallet && startupData && user) {
      console.log("[ImprovedMetaMaskPayment] Sending wallet missing notification", {
        startupId,
        investorId: user.id || user.uid,
        startupName: startupData.name || startupName
      });
      
      // Send wallet missing notification via WebSocket
      sendWebSocketMessage('wallet_missing_notification', {
        startupId: startupId.toString(),
        investorId: user.id || user.uid,
        startupName: startupData.name || startupName,
        investorName: user.username || 'An investor'
      });
    }
  }, [isLoadingWallet, founderWallet, startupData, user, startupId, startupName]);
  
  // Listen for wallet updates from WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'wallet_update_notification') {
      // If this update is for our startup, refresh the wallet data
      if (lastMessage.startupId.toString() === startupId.toString()) {
        console.log("[ImprovedMetaMaskPayment] Received wallet update via WebSocket:", lastMessage);
        
        // If the message includes a wallet address, set it directly to avoid another Firebase fetch
        if (lastMessage.walletAddress && lastMessage.walletAddress.startsWith('0x')) {
          setFounderWallet(lastMessage.walletAddress);
          setWalletSource("websocket_notification");
          setIsLoadingWallet(false);
          
          // Show a toast notification
          toast({
            title: "Startup Wallet Updated",
            description: "The founder's wallet has been connected. You can now proceed with your investment.",
          });
        } else {
          // Otherwise refresh from Firebase
          loadStartupWallet();
        }
      }
    }
  }, [lastMessage, startupId, toast]);
  
  // Whether we have a valid wallet address for the founder
  const effectiveHasWallet = !!founderWallet;
                             
  // For wallet discovery logging only
  console.log("Wallet Discovery - Founder wallet sources:", {
    startupId,
    startupFounderId: startupData?.founderId,
    founderWalletAddress,
    founderWallet,
    walletSource,
    effectiveHasWallet
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
  
  // Add effect for real-time updates when a transaction is processed
  useEffect(() => {
    if (!user || !txHash) return;
    
    // Set up interval to refresh transaction status
    const intervalId = setInterval(() => {
      try {
        setRefreshing(true);
        // Use the dedicated refresh function
        refreshTransactions();
        console.log("[MetaMask] Refreshed transaction status every 10 seconds");
      } catch (error) {
        console.error("[MetaMask] Error refreshing transaction status:", error);
      } finally {
        setRefreshing(false);
      }
    }, 10000); // Refresh every 10 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [user, txHash, refreshTransactions]);
  
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
        
        // Also check if user has a wallet in their profile
        const userHasWalletInProfile = user && user.walletAddress && user.walletAddress.length > 0;

        console.log("[ImprovedMetaMaskPayment] Connection status:", {
          metaMaskConnected,
          localStorageWalletStatus,
          effectiveWalletAddress,
          userWalletAddress: user?.walletAddress,
          userHasWalletInProfile
        });

        // If we have a stored wallet, MetaMask reports connected, or user has wallet in profile, try to connect
        if (metaMaskConnected || isStoredAsConnected || effectiveWalletAddress || userHasWalletInProfile) {
          console.log("[ImprovedMetaMaskPayment] Attempting to auto-connect wallet");
          await connect();
        }
      } catch (error) {
        console.error("[ImprovedMetaMaskPayment] Error during auto-connect:", error);
      }
    };

    attemptAutoConnect();
  }, [isInstalled, address, connect, isWalletConnected, effectiveWalletAddress, user]);
  
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

    // Load the real founder wallet directly from our reliable API
    // This is a more direct approach to ensure we never use a sample wallet
    console.log(`[ImprovedMetaMaskPayment] Getting startup wallet for ID: ${startupId}`);
    const startupWallet = await getStartupWalletNew(startupId);
    
    // Log all wallet sources for debugging
    console.log("Investment - All wallet sources:", {
      startupWalletFromReliableApi: startupWallet,
      founderWalletAddress,
      founderWallet
    });
    
    // Use the wallet from our reliable API as our primary source
    // This is the wallet we fetched directly, no fallback needed since it's reliable
    
    // Check if founder wallet is available
    if (!startupWallet) {
      console.error("Investment - No founder wallet found", {
        startupId,
        startupWalletFromReliableApi: startupWallet
      });
      
      toast({
        title: "Founder Wallet Not Found",
        description: "Unable to locate a wallet address for this startup's founder. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if the wallet address is from a sample wallet/test wallet list
    const isSample = !startupWallet.startsWith('0x') || startupWallet.includes('sample') || startupWallet.includes('test');
    if (isSample) {
      console.error("Investment - Invalid wallet detected, cannot use for real payments:", startupWallet);
      toast({
        title: "Invalid Wallet Address",
        description: "This startup has an invalid wallet address format. Real startups must connect their actual MetaMask wallet.",
        variant: "destructive"
      });
      return;
    }
    
    // For extra validation, log wallet details
    console.log("Investment - Proceeding with founder wallet:", {
      wallet: startupWallet,
      startupId,
      founderId: startupData?.founderId,
      walletSource: "firebase_direct"
    });

    setIsProcessing(true);
    setTransactionProgress(10);

    try {
      // Clean the amount string for transaction
      const cleanAmount = numericAmount.toFixed(Math.min(18, amount.includes('.') ? amount.split('.')[1].length : 0));
      
      // Show transaction preparation progress
      setTransactionProgress(30);
      
      // Process the transaction using direct ETH transfer with our newly fetched wallet
      // Make sure we have a valid wallet address (not null)
      if (!startupWallet) {
        throw new Error("Founder wallet address is missing or invalid");
      }
      const result = await sendDirectETH(startupWallet, cleanAmount);
      
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
          toAddress: startupWallet, // Use the directly fetched wallet address
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
        
        // Record transaction in our backend for API access
        try {
          const result = await createTransaction.mutateAsync({
            startupId: startupId.toString(),
            investorId: user.id.toString(),
            amount: cleanAmount, 
            paymentMethod: "metamask",
            transactionId: transactionId,
            status: "completed" // MetaMask transactions are considered completed immediately
          });
          console.log("[MetaMask] Created transaction in backend:", result);
          
          // Force immediate query invalidation
          queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
        } catch (backendError) {
          console.error("[MetaMask] Failed to create backend transaction record:", backendError);
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
  
  // We're now using the enhanced wallet discovery mechanism from the top of the component
  // No need for additional wallet resolution logic here
  
  // Create a founder info object for display/reference
  const effectiveFounderInfo = {
    name: startupData?.name || "Founder",
    walletAddress: founderWallet || null
  };
  
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
              We've sent a notification to remind them to connect their wallet.
            </AlertDescription>
          </Alert>
          
          {/* Add a button to manually try again */}
          <div className="pt-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={loadStartupWallet}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Again
            </Button>
          </div>
          
          {/* Add a note about alternative payment methods */}
          <div className="mt-2 text-sm text-muted-foreground">
            <p>While waiting for the founder to connect their wallet, you can:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Try UPI payment if available</li>
              <li>Send the founder a message to remind them</li>
              <li>Check back later - we'll notify you when their wallet is connected</li>
            </ul>
          </div>
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
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => window.open(`https://etherscan.io/tx/${txHash}`, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Etherscan
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setRefreshing(true);
                // Use the dedicated refresh function from the hook
                refreshTransactions();
                setTimeout(() => setRefreshing(false), 1000);
              }}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Transactions
            </Button>
          </div>
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
              {truncateAddress(founderWallet || "")}
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