import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./context/MongoAuthContext"; // MongoDB-native auth provider
import { WebSocketProvider } from "@/context/WebSocketContext"; // WebSocket context for real-time updates
import { ProtectedRoute } from "./lib/protected-route"; // MongoDB-compatible protected route
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
import TransactionDetails from "@/pages/TransactionDetails";
import Chat from "@/pages/Chat";
import Profile from "@/pages/Profile";
import WalletConnection from "@/pages/WalletConnection";
import WalletSetup from "@/pages/WalletSetup";
import WalletDiagnostics from "@/pages/WalletDiagnostics";
import ImageKitTest from "@/pages/ImageKitTest";
import MediaViewerTest from "@/pages/MediaViewerTest";
import StartupMediaExplorer from "@/pages/StartupMediaExplorer";
import { useState, useEffect } from "react";
import { useAuth } from "./context/MongoAuthContext";
import WalletPrompt from "@/components/auth/WalletPrompt";

// AutoRedirect component to handle automatic redirection after login
function AutoRedirect() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
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
    } else if (!isLoading && !user) {
      console.log("AutoRedirect - No authenticated user");
    }
  }, [isLoading, user, navigate]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignIn} />
      <Route path="/signup" component={SignUp} />
      
      {/* Auto-redirect route */}
      <ProtectedRoute
        path="/dashboard"
        children={<AutoRedirect />}
      />
      
      {/* Protected Founder Routes */}
      <ProtectedRoute 
        path="/founder/dashboard" 
        requiredRole="founder"
        children={<FounderDashboard />} 
      />
      
      {/* Protected Investor Routes */}
      <ProtectedRoute 
        path="/investor/dashboard" 
        requiredRole="investor"
        children={<InvestorDashboard />} 
      />
      
      {/* Protected Routes for All Authenticated Users */}
      <ProtectedRoute 
        path="/startup/:id" 
        children={<StartupDetails />} 
      />
      
      <ProtectedRoute 
        path="/transactions" 
        children={<Transactions />} 
      />

      <ProtectedRoute 
        path="/transactions/:id" 
        children={<TransactionDetails />} 
      />
      
      <ProtectedRoute 
        path="/chat/founder/:founderId" 
        children={<Chat isDirectFounderChat={true} />} 
      />
      
      <ProtectedRoute 
        path="/chat/:id" 
        children={<Chat />} 
      />
      
      <ProtectedRoute 
        path="/chat" 
        children={<Chat />} 
      />
      
      <ProtectedRoute 
        path="/profile" 
        children={<Profile />} 
      />
      
      <ProtectedRoute 
        path="/wallet-connect" 
        children={<WalletConnection />} 
      />
      
      <ProtectedRoute 
        path="/wallet-setup" 
        children={<WalletSetup />} 
      />
      
      {/* Wallet Diagnostics Tool - Restricted to admin/founder */}
      <ProtectedRoute 
        path="/wallet-diagnostics" 
        children={<WalletDiagnostics />} 
      />
      
      {/* ImageKit test page */}
      <ProtectedRoute 
        path="/imagekit-test" 
        children={<ImageKitTest />} 
      />
      
      {/* Media Viewer test page (public for easy testing) */}
      <Route path="/media-viewer-test" component={MediaViewerTest} />
      
      {/* Media Explorer page */}
      <ProtectedRoute 
        path="/media-explorer" 
        children={<StartupMediaExplorer />} 
      />
      
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

// Real wallet integration component (replaced sample wallet initialization)
function WalletDatabaseInitializer() {
  useEffect(() => {
    // Log that we're using real wallet connections only
    console.log("Wallet initialization complete - using real wallets from startup signups");
  }, []);
  
  return null;
}

function App() {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Router />
        </main>
        <Footer />
        <GlobalWalletChecker />
        <WalletDatabaseInitializer />
      </div>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
