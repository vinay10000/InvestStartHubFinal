import { useAuth } from "@/context/MongoAuthContext";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";
import React, { ReactNode } from "react";

// Updated Protected Route to support both component and children patterns
export function ProtectedRoute({
  path,
  component: Component,
  children,
  requiredRole
}: {
  path: string;
  component?: () => React.JSX.Element;
  children?: ReactNode;
  requiredRole?: string;
}) {
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
        <Redirect to="/signin" />
      </Route>
    );
  }

  // Check for role-based access if requiredRole is specified
  if (requiredRole && user.role !== requiredRole) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2">You do not have permission to access this page.</p>
        </div>
      </Route>
    );
  }

  // Support both component and children patterns
  return (
    <Route path={path}>
      {Component ? <Component /> : children}
    </Route>
  );
}