import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EyeIcon, EyeOffIcon, Wallet, Loader2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useWeb3 } from "@/hooks/useWeb3";
import { Badge } from "@/components/ui/badge";

// Form schema for sign in
const signInSchema = z.object({
  username: z.string().email("Please enter a valid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

// Create a custom schema for signup that doesn't extend the sign-in schema
const signUpSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Please enter a valid email address"),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Please enter a valid Ethereum wallet address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignInFormValues = z.infer<typeof signInSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;

interface AuthFormProps {
  type: "signin" | "signup";
  onSubmit: (email: string, password: string, username: string, walletAddress?: string) => Promise<void>;
  isLoading: boolean;
}

const AuthForm = ({ type, onSubmit, isLoading }: AuthFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  
  // Only initialize web3 hook for signup since we don't need it for signin
  const { isInstalled, address, connect, isWalletConnected } = type === "signup" ? useWeb3() : 
    { isInstalled: false, address: null, connect: () => Promise.resolve(false), isWalletConnected: () => false };

  const formSchema = type === "signin" ? signInSchema : signUpSchema;
  
  const form = useForm<SignInFormValues | SignUpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: type === "signin" 
      ? { username: "", password: "" }
      : { username: "", email: "", walletAddress: "", password: "", confirmPassword: "" },
  });

  // Update the form value when wallet connects
  useEffect(() => {
    if (type === "signup" && address) {
      form.setValue("walletAddress", address);
    }
  }, [address, type, form]);
  
  // Handle MetaMask connection
  const handleConnectWallet = async () => {
    // If already connected, don't try to connect again
    if (address) {
      console.log("Wallet already connected:", address);
      return;
    }
    
    if (!isInstalled) {
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    
    setConnectingWallet(true);
    try {
      const success = await connect();
      
      if (success && address) {
        console.log("Successfully connected wallet:", address);
        form.setValue("walletAddress", address);
      } else {
        console.log("Failed to connect wallet or no address returned");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleSubmit = async (data: SignInFormValues | SignUpFormValues) => {
    if (type === "signin") {
      const { username, password } = data as SignInFormValues;
      await onSubmit("", password, username); // Email is not used for sign in
    } else {
      const { email, password, username, walletAddress } = data as SignUpFormValues;
      // Use the connected wallet address from the state if available, otherwise use form value
      const effectiveWalletAddress = address || walletAddress;
      await onSubmit(email, password, username, effectiveWalletAddress);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{type === "signin" ? "Email" : "Username"}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={type === "signin" ? "Enter your email" : "Enter your username"} 
                  type={type === "signin" ? "email" : "text"}
                  {...field} 
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {type === "signup" && (
          <>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter your email" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="walletAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ethereum Wallet</FormLabel>
                  <FormControl>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input 
                          type="text" 
                          placeholder="Connect MetaMask to automatically fill" 
                          {...field} 
                          disabled={true}
                          className={address ? "pr-16 text-green-600 dark:text-green-400 font-medium" : ""}
                        />
                        {address && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Connected</Badge>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant={address ? "outline" : "default"}
                        onClick={handleConnectWallet}
                        disabled={isLoading || connectingWallet}
                        className="whitespace-nowrap"
                      >
                        {connectingWallet ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : address ? (
                          <>
                            <Wallet className="mr-2 h-4 w-4" />
                            Connected
                          </>
                        ) : (
                          <>
                            <Wallet className="mr-2 h-4 w-4" />
                            Connect MetaMask
                          </>
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  {!address && (
                    <p className="text-sm text-muted-foreground mt-1.5">
                      Connect your MetaMask wallet to verify your Ethereum address
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter your password" 
                    {...field} 
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {type === "signup" && (
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Confirm your password" 
                      {...field} 
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOffIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner 
              size="sm" 
              variant="primary" 
              loadingText={type === "signin" ? "Signing in..." : "Creating account..."}
            />
          ) : (
            type === "signin" ? "Sign in" : "Create account"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default AuthForm;
