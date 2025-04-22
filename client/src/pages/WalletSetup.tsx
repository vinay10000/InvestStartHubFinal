import React, { useEffect } from 'react';
import { useLocation, useRouter } from 'wouter';
import { useAuth } from '@/context/MongoAuthContext';
import WalletConnect from '@/components/auth/WalletConnect';
import { apiRequest } from '@/lib/queryClient';

const WalletSetup: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const router = useRouter();
  
  // Get the intended destination from URL query params or localStorage
  const params = new URLSearchParams(window.location.search);
  const urlRedirect = params.get('redirect');
  const storedRedirect = localStorage.getItem('wallet_redirect');
  
  // Use URL redirect param, then localStorage, then fallback to role-based dashboard
  const redirectUrl = urlRedirect || 
    storedRedirect || 
    (user?.role === 'founder' ? '/founder/dashboard' : '/investor/dashboard');
  
  useEffect(() => {
    // If user is not logged in, redirect to login
    if (!isLoading && !user) {
      navigate('/signin?redirect=/wallet-setup');
    }
    
    // Check if user already has a wallet in MongoDB
    const checkExistingWallet = async () => {
      if (user?.id) {
        try {
          // Get wallet data from MongoDB API
          const response = await apiRequest('GET', `/api/wallets/user/${user.id}`);
          const walletData = await response.json();
          
          // If user already has a permanent wallet, redirect directly
          if (walletData && walletData.address && walletData.isPermanent) {
            navigate(redirectUrl);
          }
        } catch (error) {
          console.error("Error checking wallet status:", error);
        }
      }
    };
    
    checkExistingWallet();
  }, [user, isLoading, navigate, redirectUrl]);
  
  if (isLoading) {
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