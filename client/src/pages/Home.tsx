import { useEffect } from "react";
import { useLocation } from "wouter";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import FeaturedStartups from "@/components/home/FeaturedStartups";
import HowItWorks from "@/components/home/HowItWorks";
import PaymentOptions from "@/components/home/PaymentOptions";
import CTASection from "@/components/home/CTASection";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";

const Home = () => {
  const [location, navigate] = useLocation();
  const { user } = useSimpleAuth();

  // Check for pending redirects when the home page loads
  useEffect(() => {
    const pendingRedirect = localStorage.getItem('pending_redirect');
    
    if (pendingRedirect && user) {
      console.log("Found pending redirect to:", pendingRedirect);
      // Clear the pending redirect
      localStorage.removeItem('pending_redirect');
      
      // Special case for role-based redirection
      if (pendingRedirect === 'check_role') {
        const userRole = localStorage.getItem('user_role') || 'investor';
        if (userRole === 'founder') {
          console.log("Redirecting to founder dashboard based on role");
          navigate('/founder/dashboard');
        } else {
          console.log("Redirecting to investor dashboard based on role");
          navigate('/investor/dashboard');
        }
      } else {
        // Regular redirect
        navigate(pendingRedirect);
      }
    }
  }, [user, navigate]);
  
  return (
    <div>
      <Hero />
      <Features />
      <FeaturedStartups />
      <HowItWorks />
      <PaymentOptions />
      <CTASection />
    </div>
  );
};

export default Home;
