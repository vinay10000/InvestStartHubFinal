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

    // Check if user has connected a wallet or has previously connected
    const hasWallet = user.walletAddress && user.walletAddress !== '';
    const hasConnectedWallet = localStorage.getItem('wallet_connected') === 'true';
    
    // If user has a wallet in their profile or has previously connected, store that state
    if (hasWallet) {
      localStorage.setItem('wallet_connected', 'true');
    }
    
    // No longer automatically showing wallet prompt for all users
    // Only show when explicitly requested through props
    console.log('WalletPrompt: No longer auto-showing wallet prompt. Contextual connections only.');
    setHasChecked(true);
  }, [user, isControlled]);

  // Callback when wallet is connected
  const handleWalletConnect = (address: string) => {
    connectWallet(address)
      .then(() => {
        handleOpenChange(false);
        
        // Redirect to the appropriate dashboard based on user role
        if (user) {
          // Check localStorage first for the role, then fallback to user object
          const userRole = localStorage.getItem('user_role') || user.role || 'investor';
          
          console.log('WalletPrompt: Redirecting user with role:', userRole);
          
          if (userRole === 'founder') {
            navigate('/founder/dashboard');
          } else {
            navigate('/investor/dashboard');
          }
          
          // Record in localStorage that we've shown the wallet prompt to avoid showing it again
          localStorage.setItem('wallet_connected', 'true');
        }
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