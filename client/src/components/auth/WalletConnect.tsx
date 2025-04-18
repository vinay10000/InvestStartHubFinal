import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Wallet, AlertTriangle, ChevronRight, LockKeyhole } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { addWalletAddress, getUserWallet, makeWalletPermanent, isWalletAvailable, WalletData } from '@/firebase/walletDatabase';
import { useLocation } from 'wouter';

interface WalletConnectProps {
  onComplete?: () => void;
  redirectPath?: string;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ 
  onComplete,
  redirectPath
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentWallet, setCurrentWallet] = useState<WalletData | null>(null);
  const [isPermanent, setIsPermanent] = useState<boolean>(false);
  const [step, setStep] = useState<'connect' | 'confirm' | 'success'>('connect');
  
  // Load existing wallet if user is logged in
  useEffect(() => {
    const loadWallet = async () => {
      if (user?.id) {
        try {
          const walletData = await getUserWallet(user.id);
          if (walletData) {
            setCurrentWallet(walletData);
            setIsPermanent(walletData.isPermanent);
          }
        } catch (error) {
          console.error('Error loading wallet data:', error);
        }
      }
    };
    
    loadWallet();
  }, [user]);
  
  // Try to get wallet from MetaMask if available
  useEffect(() => {
    const connectMetaMask = async () => {
      if (window.ethereum && !currentWallet) {
        try {
          // Request account access
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.log('MetaMask not available or user denied access');
        }
      }
    };
    
    connectMetaMask();
  }, [currentWallet]);
  
  const isValidEthAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };
  
  const handleConnectWallet = async () => {
    if (!user?.id) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to connect your wallet',
        variant: 'destructive'
      });
      return;
    }
    
    if (!isValidEthAddress(walletAddress)) {
      toast({
        title: 'Invalid Wallet Address',
        description: 'Please enter a valid Ethereum wallet address (0x...)',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Check if wallet is already associated with another account
      const isAvailable = await isWalletAvailable(walletAddress);
      
      if (!isAvailable) {
        toast({
          title: 'Wallet Already In Use',
          description: 'This wallet address is already associated with another account',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      
      // Move to confirmation step
      setStep('confirm');
    } catch (error) {
      console.error('Error checking wallet availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify wallet availability. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmWallet = async () => {
    if (!user?.id || !user.username) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to connect your wallet',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Add wallet to Firebase
      await addWalletAddress(
        walletAddress,
        user.id,
        user.username,
        isPermanent
      );
      
      // If wallet was set as permanent, make it permanent in Firebase
      if (isPermanent) {
        await makeWalletPermanent(walletAddress, user.id);
      }
      
      // Update local state
      setCurrentWallet({
        address: walletAddress,
        userId: user.id,
        username: user.username,
        isPermanent: isPermanent,
        timestamp: Date.now()
      });
      
      // Show success step
      setStep('success');
      
      toast({
        title: 'Wallet Connected',
        description: 'Your wallet has been successfully connected to your account.'
      });
      
      // Call completion callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect wallet. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRedirect = () => {
    if (redirectPath) {
      navigate(redirectPath);
    }
  };
  
  // If user already has a wallet connected
  if (currentWallet) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Connected
          </CardTitle>
          <CardDescription>
            Your wallet is already connected to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-green-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Address</span>
              <span className="text-sm font-mono break-all">{currentWallet.address}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status</span>
              <span className="text-sm">
                {currentWallet.isPermanent ? (
                  <span className="flex items-center text-green-700">
                    <LockKeyhole className="h-3 w-3 mr-1" />
                    Permanent
                  </span>
                ) : (
                  'Changeable'
                )}
              </span>
            </div>
          </div>
          
          {!currentWallet.isPermanent && (
            <Alert className="bg-amber-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Your wallet is changeable</AlertTitle>
              <AlertDescription>
                You can change your wallet address at any time. To prevent unauthorized changes,
                you can make it permanent.
              </AlertDescription>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={async () => {
                  if (user?.id) {
                    try {
                      setIsLoading(true);
                      await makeWalletPermanent(currentWallet.address, user.id);
                      setCurrentWallet({
                        ...currentWallet,
                        isPermanent: true
                      });
                      toast({
                        title: 'Wallet Made Permanent',
                        description: 'Your wallet address is now permanent and cannot be changed.'
                      });
                    } catch (error: any) {
                      console.error('Error making wallet permanent:', error);
                      toast({
                        title: 'Error',
                        description: error.message || 'Failed to make wallet permanent',
                        variant: 'destructive'
                      });
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }}
                disabled={isLoading}
              >
                Make Permanent
              </Button>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          {redirectPath && (
            <Button 
              className="w-full"
              onClick={handleRedirect}
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }
  
  // Connect wallet step
  if (step === 'connect') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Your Wallet
          </CardTitle>
          <CardDescription>
            Link your Ethereum wallet address to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Each wallet address can only be linked to one account. Once connected, 
              you'll use this address for all crypto transactions on the platform.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="wallet-address">Ethereum Wallet Address</Label>
            <Input
              id="wallet-address"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
            />
            {walletAddress && !isValidEthAddress(walletAddress) && (
              <p className="text-xs text-red-500">
                Please enter a valid Ethereum address (0x...)
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleConnectWallet}
            disabled={isLoading || !walletAddress || !isValidEthAddress(walletAddress)}
          >
            Continue
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Confirm wallet step
  if (step === 'confirm') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Confirm Your Wallet
          </CardTitle>
          <CardDescription>
            Review and confirm your wallet connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-slate-50">
            <div className="text-sm font-medium mb-2">Wallet Address</div>
            <div className="text-sm font-mono break-all mb-4">{walletAddress}</div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="permanent-wallet"
                checked={isPermanent}
                onCheckedChange={setIsPermanent}
              />
              <Label htmlFor="permanent-wallet" className="text-sm cursor-pointer">
                Make wallet address permanent
              </Label>
            </div>
            
            {isPermanent && (
              <p className="text-xs text-amber-600 mt-2">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                This action cannot be undone. A permanent wallet cannot be changed later.
              </p>
            )}
          </div>
          
          <Alert className="bg-blue-50">
            <AlertTitle>Confirmation Required</AlertTitle>
            <AlertDescription>
              By connecting this wallet, you confirm that you own this address and consent to use it for 
              cryptocurrency transactions on this platform.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            className="w-full" 
            onClick={handleConfirmWallet}
            disabled={isLoading}
          >
            Connect Wallet
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setStep('connect')}
            disabled={isLoading}
          >
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Success step
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <Wallet className="h-5 w-5" />
          Wallet Connected
        </CardTitle>
        <CardDescription>
          Your wallet has been successfully connected
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-green-50 text-green-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Address</span>
            <span className="text-sm font-mono break-all">{walletAddress}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Status</span>
            <span className="text-sm">
              {isPermanent ? (
                <span className="flex items-center">
                  <LockKeyhole className="h-3 w-3 mr-1" />
                  Permanent
                </span>
              ) : (
                'Changeable'
              )}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {redirectPath ? (
          <Button 
            className="w-full"
            onClick={handleRedirect}
          >
            Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            className="w-full"
            onClick={onComplete}
          >
            Done
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default WalletConnect;