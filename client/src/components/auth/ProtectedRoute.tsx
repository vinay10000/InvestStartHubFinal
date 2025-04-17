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
      // Normalize roles to lowercase for consistent comparison
      const userRole = (storedRole || user.role || 'investor').toLowerCase();
      
      console.log('⭐ IMPORTANT - ProtectedRoute debug info:', {
        storedRole,
        userObjectRole: user.role,
        finalUserRole: userRole,
        requiredRole: requiredRole?.toLowerCase(),
        requestedPath: window.location.pathname
      });
      
      // If role-specific route and user doesn't have the required role
      if (requiredRole) {
        const normalizedRequiredRole = requiredRole.toLowerCase();
        if (userRole !== normalizedRequiredRole) {
          console.log(`⭐ CRITICAL ERROR - Role mismatch: User has '${userRole}', but '${normalizedRequiredRole}' is required`);
          // Redirect to home page if role doesn't match
          navigate('/');
          return;
        }
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
      
      // Ensure role is normalized to lowercase for consistent comparison
      const userRole = (storedRole || user.role || 'investor').toLowerCase();
      const normalizedRequiredRole = requiredRole.toLowerCase();
      
      console.log('⭐ IMPORTANT - ProtectedRoute rendering check:', {
        storedRole,
        userObjectRole: user.role,
        finalUserRole: userRole,
        requiredRole: normalizedRequiredRole,
        doRolesMatch: userRole === normalizedRequiredRole,
        path: window.location.pathname
      });
      
      // Rewrite roles to localStorage to ensure consistency
      localStorage.setItem('user_role', userRole);
      
      if (userRole !== normalizedRequiredRole) {
        console.log(`ProtectedRoute: Not rendering - role mismatch. User has '${userRole}', but '${normalizedRequiredRole}' is required. Redirecting to appropriate dashboard.`);
        
        // Redirect to the appropriate dashboard based on the user's actual role
        if (userRole === 'founder') {
          navigate('/founder/dashboard');
        } else {
          navigate('/investor/dashboard');
        }
        
        return null; // Don't render if role doesn't match
      }
    }
    
    // No longer forcing wallet connection in protected routes
    // We'll check wallet connection status in specific components as needed
    const hasWallet = user.walletAddress && user.walletAddress !== '';
    const hasConnectedWallet = localStorage.getItem('wallet_connected') === 'true';
    
    if (!hasWallet && !hasConnectedWallet) {
      console.log('ProtectedRoute: User has no wallet connected, but continuing without forcing connection');
      // No longer showing wallet prompt here
    }
    
    // Use React.lazy for dynamic imports in Vite
    return <>{children}</>;
  }

  // This shouldn't render as the useEffect should redirect
  return null;
};

export default ProtectedRoute;