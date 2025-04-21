import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Redirect, Route } from 'wouter';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    console.log("ProtectedRoute: Not authenticated, redirecting to /auth-test");
    return <Redirect to="/auth-test" />;
  }

  // Role check if required
  if (requiredRole && user.role !== requiredRole) {
    console.log(`ProtectedRoute: User role (${user.role}) doesn't match required role (${requiredRole})`);
    return <Redirect to="/" />;
  }

  // User is authenticated and has the required role (if specified)
  return <>{children}</>;
}

export default ProtectedRoute;