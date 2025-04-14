import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
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

function Router() {
  const { user, loading } = useAuth();

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignIn} />
      <Route path="/signup" component={SignUp} />
      
      {/* Protected Routes */}
      {user && user.role === "founder" && (
        <Route path="/founder/dashboard" component={FounderDashboard} />
      )}
      
      {user && user.role === "investor" && (
        <Route path="/investor/dashboard" component={InvestorDashboard} />
      )}
      
      {user && (
        <>
          <Route path="/startup/:id" component={StartupDetails} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/chat" component={Chat} />
          <Route path="/chat/:id" component={Chat} />
          <Route path="/profile" component={Profile} />
        </>
      )}
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Router />
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
