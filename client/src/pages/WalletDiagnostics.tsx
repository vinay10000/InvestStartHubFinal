import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useRoute } from 'wouter';
import WalletDiagnosticsTool from '@/components/diagnostics/WalletDiagnosticsTool';
import WebSocketDiagnostics from '@/components/diagnostics/WebSocketDiagnostics';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, AlertTriangle, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Admin page for diagnosing and fixing wallet connection issues
 */
const WalletDiagnostics: React.FC = () => {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [currentStartupId, setCurrentStartupId] = useState<string>('');
  
  // Check if the user is an admin or has appropriate role
  const isAuthorized = user && (user.role === 'admin' || user.role === 'founder');
  
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center p-6">
          <CardContent className="pt-6">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg font-medium">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!user) {
    // Redirect to login if not authenticated
    setLocation('/login');
    return null;
  }
  
  if (!isAuthorized) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Helmet>
          <title>Unauthorized Access | Wallet Diagnostics</title>
        </Helmet>
        
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Unauthorized Access
            </CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mt-4">
              <Button
                onClick={() => setLocation('/')}
                variant="default"
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Helmet>
        <title>Wallet Diagnostics | StartupConnect</title>
      </Helmet>
      
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Wallet Diagnostics</h1>
          <p className="text-muted-foreground mt-2">
            Diagnose and fix wallet connection issues for startups and founders
          </p>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Important Information
            </CardTitle>
            <CardDescription>
              Before using this tool, please read the following instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">How to Use</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Enter a startup ID to run diagnostics on the wallet connections</li>
                <li>Optionally enter a founder ID if you know which founder should be associated</li>
                <li>Click "Run Diagnostics" to analyze the wallet connections</li>
                <li>If issues are found, you can use the "Fix Wallet Connection" button to repair the connections</li>
                <li>You can browse existing users with wallets and startups using the respective buttons</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Common Issues</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Missing sameId connection between founder and startup</li>
                <li>Wallet address stored in different locations or formats</li>
                <li>Invalid or missing wallet address in the founder's profile</li>
                <li>Inconsistent IDs between Firebase and the local database</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Note</h3>
              <p className="text-sm">
                This tool directly interacts with the Firebase database. Use it carefully to avoid data corruption.
                For complex issues, please consult the development team.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="standard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standard" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Standard Diagnostics
            </TabsTrigger>
            <TabsTrigger value="websocket" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Real-time Diagnostics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="standard" className="mt-4">
            <WalletDiagnosticsTool />
          </TabsContent>
          
          <TabsContent value="websocket" className="mt-4">
            <WebSocketDiagnostics startupId={currentStartupId} />
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Test Startup ID</CardTitle>
                <CardDescription>
                  Enter a startup ID to test with the WebSocket diagnostics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter Startup ID"
                    value={currentStartupId}
                    onChange={(e) => setCurrentStartupId(e.target.value)}
                  />
                  <Button 
                    onClick={() => {
                      if (currentStartupId) {
                        // Force refresh by setting a data attribute
                        const wsComponent = document.getElementById('websocket-diagnostics');
                        if (wsComponent) {
                          wsComponent.setAttribute('data-refresh', Date.now().toString());
                          // Also manually trigger the run diagnostics button if possible
                          const runButton = wsComponent.querySelector('button');
                          if (runButton) {
                            runButton.click();
                          }
                        }
                      }
                    }}
                    disabled={!currentStartupId}
                  >
                    Set ID
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WalletDiagnostics;