import React, { useEffect } from 'react';
import { useLocation, useRouter } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import WalletConnect from '@/components/auth/WalletConnect';
import { initializeWalletDatabase, getUserWallet } from '@/firebase/walletDatabase';

const WalletSetup: React.FC = () => {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const router = useRouter();
  
  // Get the intended destination from URL query params
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get('redirect') || 
    (user?.role === 'founder' ? '/dashboard/founder' : '/dashboard/investor');
  
  useEffect(() => {
    // Initialize the wallet database
    initializeWalletDatabase();
    
    // If user is not logged in, redirect to login
    if (!loading && !user) {
      navigate('/signin?redirect=/wallet-setup');
    }
    
    // Check if user already has a wallet
    const checkExistingWallet = async () => {
      if (user?.id) {
        const walletData = await getUserWallet(user.id);
        // If user already has a permanent wallet, redirect directly
        if (walletData && walletData.isPermanent) {
          navigate(redirectUrl);
        }
      }
    };
    
    checkExistingWallet();
  }, [user, loading, navigate, redirectUrl]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Connect Your Wallet</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Ethereum wallet to continue using the platform
        </p>
      </div>
      
      <WalletConnect 
        redirectPath={redirectUrl}
      />
    </div>
  );
};

export default WalletSetup;