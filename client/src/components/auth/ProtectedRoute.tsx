import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useSimpleAuth } from '@/hooks/useSimpleAuth'; // Use our simplified auth hook
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'founder' | 'investor';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useSimpleAuth(); // Use our simplified auth context
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!user) {
        navigate('/signin?redirect=' + window.location.pathname);
        return;
      }
      
      // Get role from user object or localStorage
      const userRole = user.customClaims?.role || 
                       localStorage.getItem('user_role') || 
                       'investor'; // Default role
      
      // If role-specific route and user doesn't have the required role
      if (requiredRole && userRole !== requiredRole) {
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

  // If authenticated (and has correct role if required), render the protected content
  if (user) {
    // For Firebase auth, extract role and check
    if (requiredRole) {
      const userRole = user.customClaims?.role || 
                      localStorage.getItem('user_role') || 
                      'investor'; // Default role
      
      if (userRole !== requiredRole) {
        return null; // Don't render if role doesn't match
      }
    }
    
    return <>{children}</>;
  }

  // This shouldn't render as the useEffect should redirect
  return null;
};

export default ProtectedRoute;