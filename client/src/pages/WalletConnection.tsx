import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import WalletConnect from "@/components/auth/WalletConnect";

const WalletConnection = () => {
  const { user, connectWallet } = useAuth();
  const [, setLocation] = useLocation();
  
  // Get the return URL from query params
  const returnUrl = new URLSearchParams(window.location.search).get("returnUrl") || "/";
  
  // Redirect if wallet is already connected
  useEffect(() => {
    if (user?.walletAddress) {
      // Wait a moment to ensure wallet is registered before redirecting
      const timer = setTimeout(() => {
        setLocation(returnUrl);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [user?.walletAddress, returnUrl, setLocation]);
  
  // Handle wallet connection
  const handleWalletConnect = async (address: string) => {
    try {
      if (connectWallet) {
        await connectWallet(address);
        console.log("Wallet connected successfully:", address);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };
  
  return (
    <div className="container max-w-lg py-12 px-4 mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-6 w-6" />
            Connect Your Wallet
          </CardTitle>
          <CardDescription>
            You need to connect a wallet to continue with your investment
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {user?.walletAddress ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Wallet Connected!</p>
                <p className="text-sm">You will be redirected automatically...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-md text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Wallet Required</p>
                  <p className="text-sm">To invest in a startup, you need to connect an Ethereum wallet. This is required for secure cryptocurrency transactions.</p>
                </div>
              </div>
              
              <div className="flex justify-center py-4">
                <WalletConnect 
                  onComplete={() => {
                    if (user?.walletAddress) {
                      console.log("Wallet connected successfully:", user.walletAddress);
                      // Add a small delay before redirecting
                      setTimeout(() => setLocation(returnUrl), 1000);
                    }
                  }}
                  redirectPath={returnUrl}
                />
              </div>
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setLocation(returnUrl)}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel and Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default WalletConnection;