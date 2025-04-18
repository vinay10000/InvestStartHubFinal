import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFounderWallet } from "@/hooks/useFounderWallet";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useWeb3 } from "@/hooks/useWeb3";
import { useTransactions } from "@/hooks/useTransactions";
import { Wallet, ExternalLink, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency, truncateAddress } from '@/lib/utils';

interface SimpleMetaMaskPaymentProps {
  startupId: number;
  startupName: string;
  onPaymentComplete?: (txHash: string, amount: string) => void;
}

export const SimpleMetaMaskPayment = ({
  startupId,
  startupName,
  onPaymentComplete,
}: SimpleMetaMaskPaymentProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { createTransaction } = useTransactions();
  
  // Web3/MetaMask state
  const { 
    isInstalled, isWalletConnected, connect, address, 
    balance, chainId, sendDirectETH
  } = useWeb3();
  
  // Founder wallet information
  const { founderWallet, founderInfo, isLoading: isWalletLoading } = useFounderWallet(startupId);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("0.1");
  const [transactionProgress, setTransactionProgress] = useState<number>(0);
  
  // Get network name
  const getNetworkName = (chainIdStr: string | null): string => {
    if (!chainIdStr) return "Unknown Network";
    let chainId: number;
    try {
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
  
  // Transaction handler
  const handleInvest = async () => {
    try {
      // Ensure MetaMask is connected
      if (!address) {
        const connected = await connect();
        if (!connected) {
          toast({
            title: "Wallet Connection Required",
            description: "Please connect MetaMask to proceed with the investment",
            variant: "destructive"
          });
          return;
        }
      }
      
      // Validate amount
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid investment amount",
          variant: "destructive"
        });
        return;
      }
      
      // Check balance
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
      
      // Check founder wallet
      if (!founderWallet) {
        toast({
          title: "Founder Wallet Not Found",
          description: "The startup founder has not connected their wallet yet",
          variant: "destructive"
        });
        return;
      }
      
      // Process transaction
      setIsProcessing(true);
      setTransactionProgress(10);
      
      // Format amount
      const cleanAmount = numericAmount.toFixed(Math.min(18, amount.includes('.') ? amount.split('.')[1].length : 0));
      setTransactionProgress(30);
      
      // Send ETH
      const result = await sendDirectETH(founderWallet, cleanAmount);
      setTransactionProgress(70);
      
      if (result) {
        setTxHash(result.transactionHash);
        setTransactionProgress(90);
        
        // Record transaction
        if (user) {
          await createTransaction.mutateAsync({
            startupId: startupId.toString(),
            investorId: user.id.toString(),
            amount: cleanAmount,
            paymentMethod: "metamask",
            transactionId: result.transactionHash,
            status: "pending"
          });
        }
        
        setTransactionProgress(100);
        
        toast({
          title: "Investment Successful",
          description: `You have successfully invested ${cleanAmount} ETH in ${startupName}`,
        });
        
        if (onPaymentComplete) {
          onPaymentComplete(result.transactionHash, cleanAmount);
        }
      }
    } catch (error: any) {
      console.error("Investment error:", error);
      setTransactionProgress(0);
      
      let errorMessage = error.message || "Failed to process your investment";
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
  
  // Transaction success view
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
  
  // Loading state
  if (isWalletLoading) {
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
  
  // No founder wallet
  if (!founderWallet) {
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
  
  // MetaMask not installed
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
  
  // Main payment form
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
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm">Network</span>
                <span className="text-sm">{getNetworkName(chainId)}</span>
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
            <span className="text-sm">{founderInfo?.name || startupName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Wallet</span>
            <span className="text-sm font-mono truncate max-w-[180px]">
              {truncateAddress(founderWallet)}
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
          disabled={isProcessing || !isWalletConnected() || !address}
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

export default SimpleMetaMaskPayment;