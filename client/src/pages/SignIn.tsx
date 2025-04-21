import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth"; // Use our MongoDB-compatible auth context
import AuthForm from "@/components/auth/AuthForm";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const SignIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginMutation } = useAuth(); // Use MongoDB-compatible auth context
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Extract redirect URL from query parameters if available
  const getRedirectUrl = () => {
    const url = new URL(window.location.href);
    const redirectTo = url.searchParams.get('redirect');
    return redirectTo || '/'; // Default to home if no redirect specified
  };

  const handleSignIn = async (email: string, password: string, username: string) => {
    try {
      setIsLoading(true);
      // If email is empty but username is provided, use username for login
      const loginUsername = username || email;
      console.log("Starting sign-in process using username:", loginUsername);
      
      // Use our MongoDB login mutation
      const user = await loginMutation.mutateAsync({
        username: loginUsername,
        password: password
      });
      
      console.log("Sign-in successful with MongoDB");
      
      if (user) {
        // Store the role in localStorage for convenience
        const userRole = user.role.toLowerCase();
        localStorage.setItem('user_role', userRole);
        console.log("Set user role from MongoDB:", userRole);
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${user.username}!`,
        });
        
        // Direct redirect based on role
        if (userRole === 'founder') {
          console.log("Redirecting to founder dashboard");
          navigate('/founder/dashboard');
        } else {
          console.log("Redirecting to investor dashboard");
          navigate('/investor/dashboard');
        }
      } else {
        // Default to dashboard if we can't determine role
        console.log("User data incomplete, redirecting to dashboard");
        localStorage.setItem('user_role', 'investor');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Error signing in with MongoDB:", error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Authentication failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Google sign-in is not supported with MongoDB authentication
  const handleGoogleSignIn = async () => {
    toast({
      title: "Not Available",
      description: "Google sign-in is no longer available as we've migrated to MongoDB authentication.",
      variant: "destructive"
    });
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
            <span className="text-xs text-gray-400 dark:text-gray-500">OR</span>
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
