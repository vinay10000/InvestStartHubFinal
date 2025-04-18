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
import WalletConnection from "@/pages/WalletConnection";
import WalletSetup from "@/pages/WalletSetup";
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import WalletPrompt from "@/components/auth/WalletPrompt";

// AutoRedirect component to handle automatic redirection after login
function AutoRedirect() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      // Check if the user has connected a wallet
      const shouldPromptWallet = 
        // Either they have no wallet address
        (!user.walletAddress || user.walletAddress === '') &&
        // Or they haven't explicitly skipped wallet connection
        localStorage.getItem('skip_wallet_setup') !== 'true';
      
      // If they need a wallet, redirect to wallet setup
      if (shouldPromptWallet) {
        console.log("AutoRedirect - User needs to connect a wallet, redirecting to setup");
        navigate('/wallet-setup');
        return;
      }
      
      // First check localStorage, then fallback to user object, then default to investor
      const storedRole = localStorage.getItem('user_role');
      
      // Normalize role to lowercase for consistency
      const userRole = (storedRole || user.role || 'investor').toLowerCase();
      
      console.log("AutoRedirect - User authenticated with role:", userRole, 
                  "stored role:", storedRole, 
                  "user object role:", user.role);
      
      // Always ensure role is stored in localStorage for consistency
      localStorage.setItem('user_role', userRole);
      console.log("AutoRedirect - Ensuring role is in localStorage:", userRole);
      
      // Double-check the role was saved correctly
      const confirmedStoredRole = localStorage.getItem('user_role');
      
      if (userRole === 'founder') {
        console.log("Auto-redirecting to founder dashboard. Stored role:", confirmedStoredRole);
        navigate('/founder/dashboard');
      } else {
        console.log("Auto-redirecting to investor dashboard. Stored role:", confirmedStoredRole);
        navigate('/investor/dashboard');
      }
    } else if (!loading && !user) {
      console.log("AutoRedirect - No authenticated user");
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
      
      <Route path="/wallet-connect">
        <ProtectedRoute>
          <WalletConnection />
        </ProtectedRoute>
      </Route>
      
      <Route path="/wallet-setup">
        <ProtectedRoute>
          <WalletSetup />
        </ProtectedRoute>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Global wallet checker without popup - removed as requested
function GlobalWalletChecker() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user) return;
    
    // Check if user has wallet address
    const hasWallet = user.walletAddress && user.walletAddress !== '';
    // Check if wallet was connected previously
    const hasConnectedWallet = localStorage.getItem('wallet_connected') === 'true';
    
    // Only log status but don't show popup anymore
    if (!hasWallet && !hasConnectedWallet) {
      console.log('GlobalWalletChecker: User has no wallet connected, but will not force prompt');
    }
  }, [user]);
  
  // No popup, just return null
  return null;
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
          <GlobalWalletChecker />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
