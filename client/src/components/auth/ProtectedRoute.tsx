import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth'; // Use our main auth hook
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'founder' | 'investor';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth(); // Use our main auth context
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!user) {
        console.log('ProtectedRoute: User not authenticated, redirecting to signin');
        navigate('/signin?redirect=' + window.location.pathname);
        return;
      }
      
      // Get role from user object or localStorage
      const userRole = user.role || 
                       localStorage.getItem('user_role') || 
                       'investor'; // Default role
      
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

  // If authenticated (and has correct role if required), render the protected content
  if (user) {
    // For Firebase auth, extract role and check
    if (requiredRole) {
      const userRole = user.role || 
                      localStorage.getItem('user_role') || 
                      'investor'; // Default role
      
      if (userRole.toLowerCase() !== requiredRole.toLowerCase()) {
        console.log(`ProtectedRoute: Not rendering - role mismatch. User has ${userRole}, but ${requiredRole} is required`);
        return null; // Don't render if role doesn't match
      }
    }
    
    // Use React.lazy for dynamic imports in Vite
    return <>{children}</>;
  }

  // This shouldn't render as the useEffect should redirect
  return null;
};

export default ProtectedRoute;