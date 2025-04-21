import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Function to check if a wallet address is a sample address
const isSampleWalletAddress = (address: string): boolean => {
  if (!address) return false;
  // Common sample wallet addresses often used in development
  const sampleWalletPrefixes = [
    '0x0000', 
    '0x1111', 
    '0x2222', 
    '0x3333',
    '0x4444',
    '0x5555',
    '0xffff',
    '0xaaaa',
    '0xbbbb',
    '0xcccc',
    '0xdddd',
    '0xeeee'
  ];
  
  // Check for exact matches of common test addresses
  const exactMatches = [
    '0x05fe362a1cb1a55a99bfdceb7e91c6cf241ee782', // This is our designated test wallet
    '0x000000000000000000000000000000000000dead', // Common burn address
    '0x0000000000000000000000000000000000000000'  // Zero address
  ];
  
  // Check for prefix matches
  const lowerAddress = address.toLowerCase();
  
  if (exactMatches.includes(lowerAddress)) {
    return true;
  }
  
  // Check for prefixes
  return sampleWalletPrefixes.some(prefix => lowerAddress.startsWith(prefix));
};

const SampleWalletCleaner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [foundSampleWallets, setFoundSampleWallets] = useState<any[]>([]);
  const [cleaningResults, setCleaningResults] = useState<string[]>([]);
  const { toast } = useToast();

  // Function to scan the database for sample wallets
  const scanForSampleWallets = async () => {
    setIsScanning(true);
    setFoundSampleWallets([]);
    
    try {
      toast({
        title: "Scanning Database",
        description: "Looking for sample wallet addresses in the database...",
      });
      
      // Scan startups
      const startups = await scanStartupsForSampleWallets();
      
      // Scan users
      const users = await scanUsersForSampleWallets();
      
      // Scan wallets collection
      const wallets = await scanWalletsCollectionForSampleWallets();
      
      // Combine all results
      const allResults = [...startups, ...users, ...wallets];
      
      setFoundSampleWallets(allResults);
      
      if (allResults.length > 0) {
        toast({
          title: "Scan Complete",
          description: `Found ${allResults.length} entities with sample wallet addresses`,
        });
      } else {
        toast({
          title: "Scan Complete",
          description: "No sample wallet addresses found in the database"
        });
      }
    } catch (error) {
      console.error("Error scanning for sample wallets:", error);
      toast({
        title: "Scan Failed",
        description: "An error occurred while scanning the database",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };
  
  // Scan startups for sample wallets using MongoDB API
  const scanStartupsForSampleWallets = async () => {
    const results: any[] = [];
    
    try {
      // Fetch all startups from MongoDB API
      const response = await fetch('/api/startups');
      if (!response.ok) {
        throw new Error('Failed to fetch startups from MongoDB');
      }
      
      const data = await response.json();
      const startups = data.startups || [];
      
      for (const startup of startups) {
        // Get wallet address from the wallets collection by startup ID
        const walletResponse = await fetch(`/api/wallets/startup/${startup.id}`);
        if (walletResponse.ok) {
          const walletData = await walletResponse.json();
          const walletAddress = walletData.walletAddress;
          
          if (walletAddress && isSampleWalletAddress(walletAddress)) {
            results.push({
              type: 'startup',
              id: startup.id,
              name: startup.name || 'Unknown Startup',
              walletAddress: walletAddress,
              path: `startups/${startup.id}`
            });
          }
        }
      }
    } catch (error) {
      console.error("Error scanning startups:", error);
    }
    
    return results;
  };
  
  // Scan users for sample wallets using MongoDB API
  const scanUsersForSampleWallets = async () => {
    const results: any[] = [];
    
    try {
      // Fetch all users with wallets from MongoDB API
      const response = await fetch('/api/user/profile?withWallet=true');
      if (!response.ok) {
        throw new Error('Failed to fetch users from MongoDB');
      }
      
      const users = await response.json();
      
      for (const user of users) {
        if (user.walletAddress && isSampleWalletAddress(user.walletAddress)) {
          results.push({
            type: 'user',
            id: user.id,
            name: user.username || user.email || 'Unknown User',
            walletAddress: user.walletAddress,
            path: `users/${user.id}`
          });
        }
      }
    } catch (error) {
      console.error("Error scanning users:", error);
    }
    
    return results;
  };
  
  // Scan wallet collection for sample wallets using MongoDB API
  const scanWalletsCollectionForSampleWallets = async () => {
    const results: any[] = [];
    
    try {
      // In MongoDB implementation, wallet addresses are stored directly with users and startups
      // This function is kept for API compatibility with the SampleWalletCleaner component
      
      // We would need an API endpoint to get all wallet addresses, for now, this returns empty results
      // as other functions already cover users and startups
    } catch (error) {
      console.error("Error scanning wallets collection:", error);
    }
    
    return results;
  };
  
  // Function to clean sample wallets from the MongoDB database
  const cleanSampleWallets = async () => {
    if (foundSampleWallets.length === 0) {
      toast({
        title: "No Sample Wallets",
        description: "There are no sample wallets to clean",
        variant: "default"
      });
      return;
    }
    
    setIsCleaning(true);
    setCleaningResults([]);
    
    try {
      toast({
        title: "Cleaning Database",
        description: "Removing sample wallet addresses from the database...",
      });
      
      const results: string[] = [];
      
      for (const item of foundSampleWallets) {
        try {
          if (item.type === 'startup' || item.type === 'user') {
            // For both startups and users, update the wallet address using the wallet connection API
            const response = await fetch('/api/user/wallet/connect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: item.id,
                walletAddress: null, // Set to null to remove wallet
              })
            });
            
            if (response.ok) {
              results.push(`Cleaned ${item.type} ${item.name} (${item.id})`);
            } else {
              const errorText = await response.text();
              throw new Error(errorText || 'Failed to update wallet');
            }
          }
        } catch (error) {
          console.error(`Error cleaning ${item.type} ${item.id}:`, error);
          results.push(`Failed to clean ${item.type} ${item.name} (${item.id}): ${error}`);
        }
      }
      
      setCleaningResults(results);
      
      toast({
        title: "Cleaning Complete",
        description: `Successfully processed ${results.length} items`
      });
      
      // Clear the found sample wallets list
      setFoundSampleWallets([]);
    } catch (error) {
      console.error("Error cleaning sample wallets:", error);
      toast({
        title: "Cleaning Failed",
        description: "An error occurred while cleaning the database",
        variant: "destructive"
      });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Sample Wallet Cleaner</CardTitle>
          <CardDescription>
            This tool scans the database for sample wallet addresses and removes them
          </CardDescription>
        </CardHeader>
        <CardContent>
          {foundSampleWallets.length > 0 ? (
            <div className="space-y-4">
              <Alert>
                <AlertTitle>Found {foundSampleWallets.length} Sample Wallets</AlertTitle>
                <AlertDescription>
                  The following entities contain sample wallet addresses that should be removed:
                </AlertDescription>
              </Alert>
              
              <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                <ul className="space-y-2">
                  {foundSampleWallets.map((item, idx) => (
                    <li key={idx} className="text-sm p-2 border-b last:border-0">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground">Type: {item.type}</div>
                      <div className="text-muted-foreground truncate">Wallet: {item.walletAddress}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : cleaningResults.length > 0 ? (
            <div className="space-y-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Cleaning Complete</AlertTitle>
                <AlertDescription>
                  All sample wallet addresses have been removed from the database.
                </AlertDescription>
              </Alert>
              
              <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                <ul className="space-y-1">
                  {cleaningResults.map((result, idx) => (
                    <li key={idx} className="text-sm border-b last:border-0 p-1">
                      {result}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Trash className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No Sample Wallets Found</h3>
              <p className="text-muted-foreground max-w-md">
                Click "Scan Database" to check for any sample wallet addresses that need to be removed
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={scanForSampleWallets} 
            disabled={isScanning || isCleaning}
          >
            {isScanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isScanning ? "Scanning..." : "Scan Database"}
          </Button>
          
          {foundSampleWallets.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={cleanSampleWallets} 
              disabled={isScanning || isCleaning}
            >
              {isCleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCleaning ? "Cleaning..." : "Clean Sample Wallets"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default SampleWalletCleaner;