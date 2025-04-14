import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'founder' | 'investor';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!user) {
        navigate('/signin?redirect=' + window.location.pathname);
        return;
      }
      
      // If role-specific route and user doesn't have the required role
      if (requiredRole && user.role !== requiredRole) {
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
  if (user && (!requiredRole || user.role === requiredRole)) {
    return <>{children}</>;
  }

  // This shouldn't render as the useEffect should redirect
  return null;
};

export default ProtectedRoute;