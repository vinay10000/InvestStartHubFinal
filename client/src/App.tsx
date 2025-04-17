import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext"; // Use the main AuthContext with Firebase
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import FounderDashboard from "@/pages/FounderDashboard";
import InvestorDashboard from "@/pages/InvestorDashboard";
import StartupDetails from "@/pages/StartupDetails";
import Transactions from "@/pages/Transactions";
import Chat from "@/pages/Chat";
import Profile from "@/pages/Profile";
import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";

// AutoRedirect component to handle automatic redirection after login
function AutoRedirect() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      // Use user.role directly from the auth context instead of localStorage
      const userRole = user.role || 'investor';
      
      if (userRole === 'founder') {
        console.log("Auto-redirecting to founder dashboard");
        navigate('/founder/dashboard');
      } else {
        console.log("Auto-redirecting to investor dashboard");
        navigate('/investor/dashboard');
      }
    }
  }, [loading, user, navigate]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignIn} />
      <Route path="/signup" component={SignUp} />
      
      {/* Auto-redirect route */}
      <Route path="/dashboard">
        <AutoRedirect />
      </Route>
      
      {/* Protected Founder Routes */}
      <Route path="/founder/dashboard">
        <ProtectedRoute requiredRole="founder">
          <FounderDashboard />
        </ProtectedRoute>
      </Route>
      
      {/* Protected Investor Routes */}
      <Route path="/investor/dashboard">
        <ProtectedRoute requiredRole="investor">
          <InvestorDashboard />
        </ProtectedRoute>
      </Route>
      
      {/* Protected Routes for All Authenticated Users */}
      <Route path="/startup/:id">
        <ProtectedRoute>
          <StartupDetails />
        </ProtectedRoute>
      </Route>
      
      <Route path="/transactions">
        <ProtectedRoute>
          <Transactions />
        </ProtectedRoute>
      </Route>
      
      <Route path="/chat">
        <ProtectedRoute>
          <Chat />
        </ProtectedRoute>
      </Route>
      
      <Route path="/chat/:id">
        <ProtectedRoute>
          <Chat />
        </ProtectedRoute>
      </Route>
      
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <Router />
          </main>
          <Footer />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
