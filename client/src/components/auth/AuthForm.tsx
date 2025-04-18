import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

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

  const formSchema = type === "signin" ? signInSchema : signUpSchema;
  
  const form = useForm<SignInFormValues | SignUpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: type === "signin" 
      ? { username: "", password: "" }
      : { username: "", email: "", walletAddress: "", password: "", confirmPassword: "" },
  });

  const handleSubmit = async (data: SignInFormValues | SignUpFormValues) => {
    if (type === "signin") {
      const { username, password } = data as SignInFormValues;
      await onSubmit("", password, username); // Email is not used for sign in
    } else {
      const { email, password, username, walletAddress } = data as SignUpFormValues;
      await onSubmit(email, password, username, walletAddress);
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
                  <FormLabel>Wallet Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Enter your Ethereum wallet address (0x...)" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
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
                      <EyeOffIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400" />
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
                        <EyeOffIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
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
