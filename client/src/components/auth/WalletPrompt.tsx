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
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocation } from 'wouter';

interface WalletPromptProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const WalletPrompt: React.FC<WalletPromptProps> = ({ 
  children, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}) => {
  const { user, connectWallet, signOut } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [, navigate] = useLocation();

  // Determine if we're in controlled mode (props) or uncontrolled mode (internal state)
  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : showPrompt;
  
  const handleOpenChange = (open: boolean) => {
    if (isControlled && externalOnOpenChange) {
      externalOnOpenChange(open);
    } else {
      setShowPrompt(open);
    }
  };

  useEffect(() => {
    // Skip when not authenticated or still loading
    if (!user || isControlled) {
      return;
    }

    // Check if user has connected a wallet
    const hasWallet = user.walletAddress && user.walletAddress !== '';
    
    // Always show prompt if no wallet is connected
    if (!hasWallet && !hasChecked) {
      setShowPrompt(true);
      setHasChecked(true);
    } else if (!hasChecked) {
      // Just mark as checked without showing
      setHasChecked(true);
    }
  }, [user, hasChecked, isControlled]);

  // Callback when wallet is connected
  const handleWalletConnect = (address: string) => {
    connectWallet(address)
      .then(() => {
        handleOpenChange(false);
      })
      .catch((error) => {
        console.error("Error connecting wallet:", error);
      });
  };

  // Handle logout if user doesn't want to connect a wallet
  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <>
      {children}

      <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
        <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Connect Your Wallet</DialogTitle>
            <DialogDescription>
              To use our platform, you need to connect a MetaMask wallet. This is required for all users and cannot be skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Required</AlertTitle>
              <AlertDescription>
                Both investors and founders must connect a wallet to use the platform. This is necessary for secure transactions.
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
            <div className="text-xs text-muted-foreground">
              If you don't want to connect a wallet, you'll need to log out
            </div>
            <div 
              onClick={handleLogout} 
              className="text-sm text-red-500 cursor-pointer hover:underline"
            >
              Log out instead
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletPrompt;