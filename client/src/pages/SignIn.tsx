import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSimpleAuth } from "@/hooks/useSimpleAuth"; // Use our simplified auth context
import AuthForm from "@/components/auth/AuthForm";
import { Link } from "wouter";

const SignIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signInWithGoogle } = useSimpleAuth(); // Use our simplified auth context
  const [location, navigate] = useLocation();

  // Extract redirect URL from query parameters if available
  const getRedirectUrl = () => {
    const url = new URL(window.location.href);
    const redirectTo = url.searchParams.get('redirect');
    return redirectTo || '/'; // Default to home if no redirect specified
  };

  const handleSignIn = async (email: string, password: string, username: string) => {
    try {
      setIsLoading(true);
      // If email is empty but username is provided, use username as email
      // This fixes the auth/invalid-email error
      const loginEmail = email || username;
      console.log("Starting sign-in process using email:", loginEmail);
      
      // Store the redirect URL before authentication
      const redirectUrl = getRedirectUrl();
      // If it's the root path, we'll check for user's role and redirect to their dashboard
      if (redirectUrl === '/') {
        localStorage.setItem('pending_redirect', 'check_role');
      } else {
        localStorage.setItem('pending_redirect', redirectUrl);
      }
      
      await signIn(loginEmail, password);
      console.log("Sign-in successful, redirecting...");
      
      // Check if we need to determine role-based dashboard
      if (redirectUrl === '/') {
        // Get user's role from localStorage
        const role = localStorage.getItem('user_role');
        if (role === 'founder') {
          window.location.href = '/founder/dashboard';
        } else {
          window.location.href = '/investor/dashboard';
        }
      } else {
        // Use direct redirection for more reliable navigation
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error("Error signing in:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log("Starting Google sign-in process");
      
      // Store the redirect URL before authentication
      const redirectUrl = getRedirectUrl();
      // If it's the root path, we'll check for user's role and redirect to their dashboard
      if (redirectUrl === '/') {
        localStorage.setItem('pending_redirect', 'check_role');
      } else {
        localStorage.setItem('pending_redirect', redirectUrl);
      }
      
      await signInWithGoogle();
      console.log("Google sign-in successful, redirecting...");
      
      // Check if we need to determine role-based dashboard
      if (redirectUrl === '/') {
        // For Google signin, since we may not have a role yet, we default to investor
        // This can be changed later in user profile
        const role = localStorage.getItem('user_role') || 'investor';
        localStorage.setItem('user_role', role);
        
        if (role === 'founder') {
          window.location.href = '/founder/dashboard';
        } else {
          window.location.href = '/investor/dashboard';
        }
      } else {
        // Use direct redirection for more reliable navigation
        window.location.href = redirectUrl;
      }
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
          <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuthForm 
            type="signin" 
            onSubmit={handleSignIn} 
            isLoading={isLoading} 
          />
          
          <div className="flex items-center space-x-2">
            <Separator className="flex-1" />
            <span className="text-xs text-gray-400">OR</span>
            <Separator className="flex-1" />
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
            Sign in with Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
            Don't have an account?{" "}
            <Link href="/signup">
              <span className="text-primary font-medium hover:underline cursor-pointer">Sign up</span>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignIn;
