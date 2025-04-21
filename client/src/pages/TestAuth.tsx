import { useEffect, useState } from 'react';
import { observeAuthState, getCurrentUser } from '@/firebase/firebaseAuth';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from 'lucide-react';

const TestAuth = () => {
  const { user, loading, signOut } = useAuth();
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Get MongoDB user using Firebase-compatible API
  useEffect(() => {
    // Initialize with current user
    const currentUser = getCurrentUser();
    if (currentUser) {
      setFirebaseUser(currentUser);
    }
    
    // Observe auth state changes
    const unsubscribe = observeAuthState((user) => {
      setFirebaseUser(user);
      setFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || firebaseLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Authentication Test Page</CardTitle>
          <CardDescription>
            This page helps verify that authentication is working properly.
            <div className="mt-2 text-amber-500 font-medium">
              Note: Authentication is now handled by MongoDB instead of Firebase
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Show Full User Details:</span>
            <Switch 
              checked={showDetails} 
              onCheckedChange={setShowDetails}
            />
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="text-lg font-semibold mb-2">MongoDB Auth Status:</h3>
            {firebaseUser ? (
              <div className="text-green-600 font-medium">
                ✅ User is authenticated in MongoDB
              </div>
            ) : (
              <div className="text-red-600 font-medium">
                ❌ No user authenticated in MongoDB
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="text-lg font-semibold mb-2">App Auth Context Status:</h3>
            {user ? (
              <div className="text-green-600 font-medium">
                ✅ User is authenticated in App Context
              </div>
            ) : (
              <div className="text-red-600 font-medium">
                ❌ No user authenticated in App Context
              </div>
            )}
          </div>

          {firebaseUser && showDetails && (
            <div className="border rounded-lg p-4 mt-4">
              <h3 className="text-lg font-semibold mb-2">MongoDB User Details:</h3>
              <pre className="bg-muted p-4 rounded overflow-auto text-xs">
                {JSON.stringify(
                  {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    emailVerified: firebaseUser.emailVerified,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    providerId: firebaseUser.providerId,
                    providerData: firebaseUser.providerData,
                  }, 
                  null, 
                  2
                )}
              </pre>
            </div>
          )}

          {user && showDetails && (
            <div className="border rounded-lg p-4 mt-4">
              <h3 className="text-lg font-semibold mb-2">App User Details:</h3>
              <pre className="bg-muted p-4 rounded overflow-auto text-xs">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          {firebaseUser && (
            <Button 
              variant="destructive" 
              onClick={() => signOut()}
            >
              Sign Out
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default TestAuth;