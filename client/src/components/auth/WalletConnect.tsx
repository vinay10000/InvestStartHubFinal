import React, { useState } from "react";
import { useWeb3 } from "@/hooks/useWeb3";
import { useToast } from "@/hooks/use-toast";
import { truncateAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Copy, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  buttonVariant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  showBalance?: boolean;
  showAddress?: boolean;
  showIcon?: boolean;
  showChainId?: boolean;
  showDialogOnConnect?: boolean;
}

const SUPPORTED_CHAIN_ID = 1337; // Ganache local testnet

const WalletConnect: React.FC<WalletConnectProps> = ({
  onConnect,
  onDisconnect,
  buttonVariant = "default",
  buttonSize = "default",
  showBalance = true,
  showAddress = true,
  showIcon = true,
  showChainId = false,
  showDialogOnConnect = true,
}) => {
  const { 
    address, 
    balance, 
    chainId, 
    isInstalled, 
    isLoading, 
    connect,
    changeNetwork
  } = useWeb3();
  
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  
  // Handle connect button click
  const handleConnect = async () => {
    if (!isInstalled) {
      toast({
        title: "MetaMask not installed",
        description: "Please install MetaMask extension first",
        variant: "destructive",
      });
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    
    const connected = await connect();
    
    if (connected && address) {
      // Mark wallet as connected in localStorage to prevent further prompts
      localStorage.setItem('wallet_connected', 'true');
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${truncateAddress(address)}`,
      });
      
      if (onConnect) {
        onConnect(address);
      }
      
      if (showDialogOnConnect) {
        setDialogOpen(true);
      }
      
      // Check if on right network and switch if needed
      const currentChainId = chainId ? Number(chainId) : null;
      if (currentChainId !== SUPPORTED_CHAIN_ID) {
        toast({
          title: "Switching Network",
          description: "Switching to Ganache network for this application",
        });
        
        const switched = await changeNetwork(SUPPORTED_CHAIN_ID.toString());
        
        if (!switched) {
          toast({
            title: "Network switch failed",
            description: "Please manually switch to Ganache network (Chain ID: 1337)",
            variant: "destructive",
          });
        }
      }
    }
  };
  
  // Handle disconnect (this is limited with MetaMask, as it doesn't support programmatic disconnect)
  const handleDisconnect = () => {
    // Remove wallet connected flag from localStorage
    localStorage.removeItem('wallet_connected');
    
    // Call the onDisconnect callback to let the parent component handle necessary state updates
    if (onDisconnect) {
      onDisconnect();
    }
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected from this application",
    });
    
    // Close the dialog
    setDialogOpen(false);
    
    // Force page reload to ensure all wallet state is cleared
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };
  
  // Handle copy address
  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setShowCopied(true);
      
      setTimeout(() => {
        setShowCopied(false);
      }, 2000);
      
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };
  
  // Get chain name
  const getChainName = (id: string | null) => {
    // Convert string to number if it's a string
    const numId = id ? Number(id) : null;
    
    if (numId === 1) return "Ethereum Mainnet";
    if (numId === 1337) return "Ganache Network";
    if (numId === 11155111) return "Sepolia Testnet";
    if (numId === 137) return "Polygon";
    if (numId === 80001) return "Mumbai Testnet";
    return numId ? `Chain ID: ${numId}` : "Unknown Chain";
  };
  
  // Check if connected to the right network
  const isRightNetwork = chainId !== null && Number(chainId) === SUPPORTED_CHAIN_ID;
  
  if (!address) {
    return (
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleConnect}
        disabled={isLoading}
      >
        {showIcon && <Wallet className="mr-2 h-4 w-4" />}
        {isLoading ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }
  
  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant={buttonVariant} size={buttonSize}>
            {showIcon && <Wallet className="mr-2 h-4 w-4" />}
            {showAddress && truncateAddress(address)}
            {showBalance && balance && ` (${parseFloat(balance || "0").toFixed(4)} ETH)`}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet Information</DialogTitle>
            <DialogDescription>
              Your wallet is connected to the application
            </DialogDescription>
          </DialogHeader>
          
          {!isRightNetwork && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Wrong Network</AlertTitle>
              <AlertDescription>
                Please switch to Ganache network to use this application.
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => changeNetwork(SUPPORTED_CHAIN_ID.toString())}
                >
                  Switch to Ganache
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Address:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{truncateAddress(address)}</span>
                <Button variant="ghost" size="icon" onClick={handleCopyAddress}>
                  {showCopied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-medium">{parseFloat(balance || "0").toFixed(4)} ETH</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Network:</span>
              <span className={`font-medium ${isRightNetwork ? "text-green-500" : "text-red-500"}`}>
                {getChainName(chainId)}
              </span>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
            >
              Close
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDisconnect}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {showChainId && (
        <div className={`text-xs ${isRightNetwork ? "text-green-500" : "text-red-500"}`}>
          {getChainName(chainId)}
        </div>
      )}
    </>
  );
};

export default WalletConnect;