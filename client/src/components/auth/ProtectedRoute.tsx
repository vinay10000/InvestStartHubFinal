import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth'; // Use our main auth hook
import { Loader2 } from 'lucide-react';
import WalletPrompt from './WalletPrompt';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'founder' | 'investor';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth(); // Use our main auth context
  const [, navigate] = useLocation();
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!user) {
        console.log('ProtectedRoute: User not authenticated, redirecting to signin');
        navigate('/signin?redirect=' + window.location.pathname);
        return;
      }
      
      // Check if user has a wallet connected or has connected previously
      const hasWallet = user.walletAddress && user.walletAddress !== '';
      const hasConnectedWallet = localStorage.getItem('wallet_connected') === 'true';
      
      // If no wallet is connected and not previously connected, force wallet connection
      if (!hasWallet && !hasConnectedWallet) {
        console.log('ProtectedRoute: User has no wallet connected, showing wallet prompt');
        setShowWalletPrompt(true);
        return;
      }
      
      // First check localStorage, then user object, then default to investor
      const storedRole = localStorage.getItem('user_role');
      const userRole = storedRole || user.role || 'investor'; // Prioritize localStorage
      
      console.log('ProtectedRoute: User authenticated with role:', userRole);
      
      // If role-specific route and user doesn't have the required role
      if (requiredRole && userRole.toLowerCase() !== requiredRole.toLowerCase()) {
        console.log(`Role mismatch: User has ${userRole}, but ${requiredRole} is required`);
        navigate('/');
        return;
      }
    }
  }, [loading, user, requiredRole, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If wallet prompt needs to be shown, show it instead of the protected content
  if (showWalletPrompt) {
    return <WalletPrompt open={showWalletPrompt} onOpenChange={setShowWalletPrompt} />;
  }

  // If authenticated (and has correct role if required), render the protected content
  if (user) {
    // For Firebase auth, extract role and check
    if (requiredRole) {
      // First check localStorage, then user object, then default to investor
      const storedRole = localStorage.getItem('user_role');
      const userRole = storedRole || user.role || 'investor'; // Prioritize localStorage
      
      if (userRole.toLowerCase() !== requiredRole.toLowerCase()) {
        console.log(`ProtectedRoute: Not rendering - role mismatch. User has ${userRole}, but ${requiredRole} is required`);
        return null; // Don't render if role doesn't match
      }
    }
    
    // Make sure user has a wallet connected or has connected previously
    const hasWallet = user.walletAddress && user.walletAddress !== '';
    const hasConnectedWallet = localStorage.getItem('wallet_connected') === 'true';
    if (!hasWallet && !hasConnectedWallet) {
      console.log('ProtectedRoute: Wallet check failed, showing wallet prompt');
      return <WalletPrompt open={true} onOpenChange={(open) => setShowWalletPrompt(open)} />;
    }
    
    // Use React.lazy for dynamic imports in Vite
    return <>{children}</>;
  }

  // This shouldn't render as the useEffect should redirect
  return null;
};

export default ProtectedRoute;