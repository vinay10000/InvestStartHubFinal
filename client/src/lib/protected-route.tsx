import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

type ProtectedRouteProps = {
  path: string;
  component: () => React.ReactNode;
  requiredRole?: "founder" | "investor";
};

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check for specific role requirements
  if (requiredRole && user.role !== requiredRole) {
    console.log(`Role mismatch: User has ${user.role}, but ${requiredRole} is required`);
    
    // Redirect to appropriate dashboard based on user's role
    return (
      <Route path={path}>
        <Redirect to={user.role === "founder" ? "/founder/dashboard" : "/investor/dashboard"} />
      </Route>
    );
  }

  // If all checks pass, render the component
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}