import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Wallet, 
  Search, 
  RefreshCcw,
  Database,
  Fingerprint
} from 'lucide-react';
import { getAllUsersWithWallets, getAllStartups, runWalletDiagnostics, saveWalletAddressComprehensive } from '@/firebase/directWalletAccess';

/**
 * A diagnostic tool component to help fix wallet connection issues
 * This can be used by admins to diagnose and repair wallet connections
 */
const WalletDiagnosticsTool: React.FC = () => {
  const [startupId, setStartupId] = useState('');
  const [founderId, setFounderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [usersWithWallets, setUsersWithWallets] = useState<any[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isStartupLoading, setIsStartupLoading] = useState(false);

  // Run diagnostic tests on a specific startup
  const runDiagnostics = async () => {
    if (!startupId) {
      setError('Please enter a startup ID');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const diagnosticResults = await runWalletDiagnostics(
        startupId,
        founderId || undefined
      );
      
      setResults(diagnosticResults);
    } catch (err) {
      console.error('Diagnostic error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Get all users with wallet addresses for reference
  const loadUsersWithWallets = async () => {
    setIsUserLoading(true);
    
    try {
      const users = await getAllUsersWithWallets();
      setUsersWithWallets(users);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsUserLoading(false);
    }
  };

  // Get all startups for reference
  const loadStartups = async () => {
    setIsStartupLoading(true);
    
    try {
      const allStartups = await getAllStartups();
      setStartups(allStartups);
    } catch (err) {
      console.error('Error loading startups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load startups');
    } finally {
      setIsStartupLoading(false);
    }
  };

  // Fix a wallet connection by saving the wallet address to all necessary places
  const fixWalletConnection = async () => {
    if (!startupId || !founderId || !results?.walletAddress) {
      setError('Missing required information (startup ID, founder ID, or wallet address)');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await saveWalletAddressComprehensive(
        startupId,
        founderId,
        results.walletAddress
      );
      
      if (success) {
        // Re-run diagnostics to confirm the fix
        const updatedResults = await runWalletDiagnostics(
          startupId,
          founderId
        );
        
        setResults(updatedResults);
      } else {
        setError('Failed to save wallet address');
      }
    } catch (err) {
      console.error('Error fixing wallet connection:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Diagnostics Tool
          </CardTitle>
          <CardDescription>
            Diagnose and fix wallet connection issues
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Startup ID</label>
              <Input
                value={startupId}
                onChange={(e) => setStartupId(e.target.value)}
                placeholder="Enter startup ID (e.g., -OOIPNti9ZgRj-ptn-AD)"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Founder ID (optional)</label>
              <Input
                value={founderId}
                onChange={(e) => setFounderId(e.target.value)}
                placeholder="Enter founder ID (e.g., 5SddFKVv8ydDMPl4sSnrgPazt3c2)"
              />
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={runDiagnostics} 
            disabled={isLoading || !startupId}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-4 mr-2 rounded-full animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Run Diagnostics
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={loadUsersWithWallets}
            disabled={isUserLoading}
            className="w-full sm:w-auto"
          >
            {isUserLoading ? (
              <>
                <Skeleton className="h-4 w-4 mr-2 rounded-full animate-spin" />
                Loading Users...
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4 mr-2" />
                Load Users with Wallets
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={loadStartups}
            disabled={isStartupLoading}
            className="w-full sm:w-auto"
          >
            {isStartupLoading ? (
              <>
                <Skeleton className="h-4 w-4 mr-2 rounded-full animate-spin" />
                Loading Startups...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Load Startups
              </>
            )}
          </Button>
          
          <Button 
            variant="destructive" 
            onClick={() => {
              // Clear session storage wallet cache for testing
              try {
                const sessionKeys = Object.keys(sessionStorage);
                let clearedKeys = 0;
                for (const key of sessionKeys) {
                  if (key.startsWith('founder_wallet_')) {
                    console.log(`Clearing cached wallet: ${key}`);
                    sessionStorage.removeItem(key);
                    clearedKeys++;
                  }
                }
                alert(`Cleared ${clearedKeys} cached wallet addresses from session storage`);
              } catch (e) {
                console.error('Failed to clear session storage:', e);
                alert('Failed to clear session storage: ' + (e as Error).message);
              }
            }}
            className="w-full sm:w-auto"
            size="sm"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Clear Wallet Cache
          </Button>
        </CardFooter>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.status === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : results.status === 'partial_success' ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Diagnostic Results
            </CardTitle>
            <CardDescription>
              Status: {' '}
              <Badge variant={
                results.status === 'success' ? 'default' : 
                results.status === 'partial_success' ? 'outline' : 
                'destructive'
              }>
                {results.status === 'success' ? 'Success' : 
                 results.status === 'partial_success' ? 'Partial Success' : 
                 'Failure'}
              </Badge>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Wallet Address */}
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <h3 className="font-medium">Wallet Address</h3>
                {results.walletAddress ? (
                  <Badge variant="outline" className="bg-green-50">Found</Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50">Not Found</Badge>
                )}
              </div>
              <p className="font-mono text-sm truncate">
                {results.walletAddress || 'No wallet address found'}
              </p>
            </div>
            
            {/* Lookup Methods */}
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-medium">Lookup Methods</h3>
              
              <div className="space-y-2">
                {results.methods?.map((method: any, index: number) => (
                  <div key={index} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-sm">{method.method}</p>
                      {method.result && (
                        <p className="font-mono text-xs truncate">{method.result}</p>
                      )}
                    </div>
                    
                    {method.successful ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Startup Info */}
            {results.startup && (
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-medium">Startup Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium">ID:</p>
                    <p className="font-mono text-xs truncate">{results.startup.id}</p>
                  </div>
                  <div>
                    <p className="font-medium">Name:</p>
                    <p className="truncate">{results.startup.name}</p>
                  </div>
                  <div>
                    <p className="font-medium">Founder ID:</p>
                    <p className="font-mono text-xs truncate">{results.startup.founderId}</p>
                  </div>
                  <div>
                    <p className="font-medium">Same ID:</p>
                    <p className="font-mono text-xs truncate">{results.startup.sameId || 'Not set'}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Founder Info */}
            {results.founder && (
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-medium">Founder Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium">ID:</p>
                    <p className="font-mono text-xs truncate">{results.founder.uid}</p>
                  </div>
                  <div>
                    <p className="font-medium">Username:</p>
                    <p className="truncate">{results.founder.username || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Email:</p>
                    <p className="truncate">{results.founder.email || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Same ID:</p>
                    <p className="font-mono text-xs truncate">{results.founder.sameId || 'Not set'}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Fix Button */}
            {results.status !== 'success' && results.walletAddress && founderId && (
              <Button 
                onClick={fixWalletConnection}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Skeleton className="h-4 w-4 mr-2 rounded-full animate-spin" />
                    Fixing Connection...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Fix Wallet Connection
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Users with Wallets */}
      {usersWithWallets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Users with Wallet Addresses
            </CardTitle>
            <CardDescription>
              {usersWithWallets.length} users found with connected wallets
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {usersWithWallets.map((user, index) => (
                <div key={index} className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="font-medium truncate">{user.username || user.email || 'Unknown User'}</div>
                    <Badge variant="outline">{user.role || 'Unknown Role'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">User ID:</p>
                      <p className="font-mono text-xs truncate">{user.uid}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Wallet:</p>
                      <p className="font-mono text-xs truncate">{user.walletAddress}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFounderId(user.uid)}
                      className="text-xs h-7"
                    >
                      Use as Founder
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Startups List */}
      {startups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Startups
            </CardTitle>
            <CardDescription>
              {startups.length} startups found
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {startups.map((startup, index) => (
                <div key={index} className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="font-medium truncate">{startup.name || 'Unnamed Startup'}</div>
                    <Badge variant="outline">{startup.investment_stage || 'Unknown Stage'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Startup ID:</p>
                      <p className="font-mono text-xs truncate">{startup.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Founder ID:</p>
                      <p className="font-mono text-xs truncate">{startup.founderId}</p>
                    </div>
                    {startup.founderWalletAddress && (
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-muted-foreground">Wallet:</p>
                        <p className="font-mono text-xs truncate">{startup.founderWalletAddress}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setStartupId(startup.id)}
                      className="text-xs h-7"
                    >
                      Use as Startup
                    </Button>
                    {startup.founderId && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFounderId(startup.founderId)}
                        className="text-xs h-7"
                      >
                        Use Founder
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WalletDiagnosticsTool;