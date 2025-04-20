import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDatabase, ref, get, remove, update } from 'firebase/database';
import { app } from '@/firebase/config';
import { isSampleWalletAddress } from '@/firebase/getStartupWallet';

// Initialize Firebase Realtime Database
const database = getDatabase(app);

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
  
  // Scan startups for sample wallets
  const scanStartupsForSampleWallets = async () => {
    const results: any[] = [];
    
    try {
      const startupsRef = ref(database, 'startups');
      const snapshot = await get(startupsRef);
      
      if (snapshot.exists()) {
        const startups = snapshot.val();
        
        for (const [id, startup] of Object.entries(startups)) {
          const startupData = startup as any;
          
          // Check for sample wallet addresses in various fields
          if (
            (startupData.founderWalletAddress && isSampleWalletAddress(startupData.founderWalletAddress)) ||
            (startupData.walletAddress && isSampleWalletAddress(startupData.walletAddress))
          ) {
            results.push({
              type: 'startup',
              id,
              name: startupData.name || 'Unknown Startup',
              walletAddress: startupData.founderWalletAddress || startupData.walletAddress,
              path: `startups/${id}`
            });
          }
        }
      }
    } catch (error) {
      console.error("Error scanning startups:", error);
    }
    
    return results;
  };
  
  // Scan users for sample wallets
  const scanUsersForSampleWallets = async () => {
    const results: any[] = [];
    
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        
        for (const [id, user] of Object.entries(users)) {
          const userData = user as any;
          
          // Check for sample wallet address
          if (userData.walletAddress && isSampleWalletAddress(userData.walletAddress)) {
            results.push({
              type: 'user',
              id,
              name: userData.username || userData.email || 'Unknown User',
              walletAddress: userData.walletAddress,
              path: `users/${id}`
            });
          }
          
          // Also check the wallet field if it exists
          if (
            userData.wallet && 
            userData.wallet.address && 
            isSampleWalletAddress(userData.wallet.address)
          ) {
            results.push({
              type: 'user.wallet',
              id,
              name: userData.username || userData.email || 'Unknown User',
              walletAddress: userData.wallet.address,
              path: `users/${id}/wallet`
            });
          }
        }
      }
    } catch (error) {
      console.error("Error scanning users:", error);
    }
    
    return results;
  };
  
  // Scan wallets collection for sample wallets
  const scanWalletsCollectionForSampleWallets = async () => {
    const results: any[] = [];
    
    try {
      const walletsRef = ref(database, 'wallets');
      const snapshot = await get(walletsRef);
      
      if (snapshot.exists()) {
        const wallets = snapshot.val();
        
        for (const [address, wallet] of Object.entries(wallets)) {
          const walletData = wallet as any;
          
          // Check if this is a sample wallet address
          if (isSampleWalletAddress(address)) {
            results.push({
              type: 'wallet',
              id: walletData.userId || 'Unknown',
              name: walletData.username || 'Unknown User',
              walletAddress: address,
              path: `wallets/${address}`
            });
          }
        }
      }
    } catch (error) {
      console.error("Error scanning wallets collection:", error);
    }
    
    return results;
  };
  
  // Function to clean sample wallets from the database
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
          if (item.type === 'startup') {
            // For startups, update the wallet fields to null
            const startupRef = ref(database, item.path);
            await update(startupRef, {
              founderWalletAddress: null,
              walletAddress: null
            });
            results.push(`Cleaned startup ${item.name} (${item.id})`);
          } else if (item.type === 'user') {
            // For users, update the walletAddress field to null
            const userRef = ref(database, item.path);
            await update(userRef, {
              walletAddress: null,
              walletUpdatedAt: Date.now()
            });
            results.push(`Cleaned user ${item.name} (${item.id})`);
          } else if (item.type === 'user.wallet') {
            // For user wallet objects, remove the wallet field
            const walletRef = ref(database, item.path);
            await remove(walletRef);
            results.push(`Removed wallet field from user ${item.name} (${item.id})`);
          } else if (item.type === 'wallet') {
            // For wallet collection entries, remove the entire record
            const walletRef = ref(database, item.path);
            await remove(walletRef);
            results.push(`Removed wallet record ${item.walletAddress}`);
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