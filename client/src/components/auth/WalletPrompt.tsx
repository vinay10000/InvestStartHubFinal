import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import WalletConnect from './WalletConnect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface WalletPromptProps {
  children: React.ReactNode;
}

const WalletPrompt: React.FC<WalletPromptProps> = ({ children }) => {
  const { user, connectWallet } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Skip when not authenticated or still loading
    if (!user) {
      return;
    }

    // Check if user has connected a wallet
    const hasWallet = user.walletAddress && user.walletAddress !== '';
    
    if (!hasWallet && !hasChecked) {
      // Only show prompt if no wallet is connected and we haven't checked yet
      setShowPrompt(true);
      setHasChecked(true);
    }
  }, [user, hasChecked]);

  // Callback when wallet is connected
  const handleWalletConnect = (address: string) => {
    connectWallet(address)
      .then(() => {
        setShowPrompt(false);
      })
      .catch((error) => {
        console.error("Error connecting wallet:", error);
      });
  };

  // Allow user to skip wallet connection for now
  const handleSkip = () => {
    setShowPrompt(false);
  };

  return (
    <>
      {children}

      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Wallet</DialogTitle>
            <DialogDescription>
              To fully use our platform, you need to connect a MetaMask wallet. This will allow you to invest in startups using cryptocurrency.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Both investors and founders need to connect a wallet to transfer or receive funds.
              </AlertDescription>
            </Alert>

            <div className="mt-4 flex justify-center">
              <WalletConnect 
                onConnect={handleWalletConnect}
                buttonSize="lg"
                showBalance={false}
                showAddress={false}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={handleSkip}>
              Skip for now
            </Button>
            <div className="text-xs text-muted-foreground">
              You can connect your wallet later from your profile
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletPrompt;