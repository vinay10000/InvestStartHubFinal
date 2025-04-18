import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth"; // Use the main auth context
import AuthForm from "@/components/auth/AuthForm";
import { Link } from "wouter";
import { getUserByUid } from "@/firebase/database"; // Import Firebase database functions
import { auth } from "@/firebase/config"; // Import Firebase auth

const SignUp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth(); // Use the main auth context
  const [location, navigate] = useLocation();
  
  // Get role from URL query parameter
  const searchParams = new URLSearchParams(window.location.search);
  const defaultRole = searchParams.get('role') === 'investor' ? 'investor' : 'founder';
  const [selectedRole, setSelectedRole] = useState<"founder" | "investor">(defaultRole as "founder" | "investor");

  const handleSignUp = async (email: string, password: string, username: string, walletAddress?: string) => {
    try {
      setIsLoading(true);
      
      // Log before signup
      console.log("Starting signup process for:", email, "with role:", selectedRole);
      
      // Make sure we clear any previous role data first
      localStorage.removeItem('user_role');
      
      // Store the selected role for easy access
      const targetRole = selectedRole;
      localStorage.setItem('user_role', targetRole);
      console.log("User role set to:", targetRole);
      
      // Sign up with Firebase using the main auth context
      if (walletAddress) {
        console.log("Including wallet address in signup:", walletAddress);
      }
      await signUp(email, password, username, targetRole, walletAddress);
      console.log("Signup successful");
      
      // Get the current Firebase user
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          // Get the user's data from Firebase Realtime Database
          const dbUser = await getUserByUid(currentUser.uid);
          console.log("Database user data after signup:", dbUser);
          
          // Direct redirect based on role
          if (targetRole === 'founder') {
            console.log("Redirecting new user to founder dashboard");
            navigate('/founder/dashboard');
          } else {
            console.log("Redirecting new user to investor dashboard");
            navigate('/investor/dashboard');
          }
          return;
        } catch (error) {
          console.error("Error getting user data after signup:", error);
        }
      }
      
      // Fallback redirect if we couldn't get the current user
      console.log("Fallback: redirecting to dashboard route");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error signing up:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log("Starting Google sign-in with role:", selectedRole);
      
      // Clear any previous role data
      localStorage.removeItem('user_role');
      
      // Store selected role in localStorage before auth
      const targetRole = selectedRole;
      localStorage.setItem('user_role', targetRole);
      console.log("User role set to:", targetRole);
      
      // Sign in with Google
      await signInWithGoogle();
      console.log("Google sign-in successful");
      
      // Get the current Firebase user
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          // Get the user data from Firebase Realtime Database
          const dbUser = await getUserByUid(currentUser.uid);
          console.log("Database user data after Google sign-in:", dbUser);
          
          // Update the role in the database if needed
          if (dbUser && (!dbUser.role || dbUser.role !== targetRole)) {
            console.log("Updating user role in database to match selected role:", targetRole);
            // Update would happen through context
          }
          
          // Direct redirect based on role
          if (targetRole === 'founder') {
            console.log("Redirecting Google user to founder dashboard");
            navigate('/founder/dashboard');
          } else {
            console.log("Redirecting Google user to investor dashboard");
            navigate('/investor/dashboard');
          }
          return;
        } catch (error) {
          console.error("Error getting user data after Google sign-in:", error);
        }
      }
      
      // Fallback redirect if we couldn't get the current user
      console.log("Fallback: redirecting to dashboard route");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error signing in with Google:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Select your role and enter your details to create an account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue={selectedRole} onValueChange={(value) => setSelectedRole(value as "founder" | "investor")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="founder">Startup Founder</TabsTrigger>
              <TabsTrigger value="investor">Investor</TabsTrigger>
            </TabsList>
            <TabsContent value="founder">
              <div className="p-2 text-center text-sm">
                Create a profile for your startup and connect with potential investors.
              </div>
            </TabsContent>
            <TabsContent value="investor">
              <div className="p-2 text-center text-sm">
                Discover promising startups and track your investments in one place.
              </div>
            </TabsContent>
          </Tabs>

          <AuthForm 
            type="signup" 
            onSubmit={handleSignUp} 
            isLoading={isLoading} 
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleGoogleSignIn} 
            disabled={isLoading}
            className="w-full"
          >
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google"
                role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z">
              </path>
            </svg>
            Continue with Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
            Already have an account?{" "}
            <Link href="/signin">
              <span className="text-primary font-medium hover:underline cursor-pointer">Sign in</span>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUp;
