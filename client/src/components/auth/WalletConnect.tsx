import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWeb3 } from "@/hooks/useWeb3";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, ExternalLink, Check, AlertCircle } from "lucide-react";
import { truncateAddress } from "@/lib/utils";

const WalletConnect = () => {
  const { isInstalled, isConnecting, address, connect } = useWeb3();
  const { user } = useAuth();
  
  const handleConnect = async () => {
    await connect();
  };

  const getWalletStatusIcon = () => {
    if (!isInstalled) {
      return <AlertCircle className="h-6 w-6 text-yellow-500" />;
    }
    
    if (address) {
      return <Check className="h-6 w-6 text-green-500" />;
    }
    
    return <AlertCircle className="h-6 w-6 text-red-500" />;
  };

  const getWalletStatusMessage = () => {
    if (!isInstalled) {
      return "MetaMask not installed";
    }
    
    if (address) {
      return "Wallet connected";
    }
    
    return "Wallet not connected";
  };

  return (
    <div className="space-y-6">
      {!isInstalled && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-6 w-6 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="font-medium">MetaMask not detected</h3>
                <p className="text-sm text-gray-600 mt-1">
                  To connect your wallet, you need to install the MetaMask extension.
                </p>
                <a 
                  href="https://metamask.io/download.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:underline text-sm mt-2"
                >
                  Install MetaMask
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center space-x-3">
          {getWalletStatusIcon()}
          <div>
            <p className="font-medium">{getWalletStatusMessage()}</p>
            {address && (
              <p className="text-sm text-gray-600">
                {truncateAddress(address)}
              </p>
            )}
          </div>
        </div>
        
        {isInstalled && !address && (
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            )}
          </Button>
        )}
      </div>

      {address && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Connected Wallet</h3>
          <p className="text-sm text-gray-600 mb-3">
            Your MetaMask wallet is connected to StartupConnect. You can now make crypto investments or receive funds.
          </p>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Address</p>
              <p className="font-mono text-sm">{address}</p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              Switch Account
            </Button>
          </div>
        </div>
      )}

      {user?.role === "founder" && (
        <div className="mt-6">
          <h3 className="font-medium mb-2">Receive Funds</h3>
          <p className="text-sm text-gray-600">
            Your connected wallet address will be used to receive investments from investors via MetaMask.
          </p>
        </div>
      )}

      {user?.role === "investor" && (
        <div className="mt-6">
          <h3 className="font-medium mb-2">Make Investments</h3>
          <p className="text-sm text-gray-600">
            Your connected wallet address will be used to send funds to startup founders via MetaMask.
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
