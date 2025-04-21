import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  updateProfileMutation: UseMutationResult<SelectUser, Error, Partial<SelectUser>>;
  connectWalletMutation: UseMutationResult<SelectUser, Error, { walletAddress: string }>;
};

type LoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);

  // Get the current user from the server
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user", {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        
        if (res.ok) {
          const data = await res.json();
          
          // Store role in localStorage for routing
          if (data.role) {
            localStorage.setItem('user_role', data.role);
          }
          
          // Store wallet connection status in localStorage
          if (data.walletAddress) {
            localStorage.setItem('wallet_connected', 'true');
          } else {
            localStorage.removeItem('wallet_connected');
          }
          
          return data;
        }
        
        return null;
      } catch (error) {
        console.error("Error fetching current user:", error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: initialized,
  });

  // Initialize the auth state
  useEffect(() => {
    setInitialized(true);
  }, []);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await fetch("/api/login", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      
      return await res.json();
    },
    onSuccess: (data: SelectUser) => {
      // Update user data in cache
      queryClient.setQueryData(["user"], data);
      
      // Store role in localStorage for routing
      if (data.role) {
        localStorage.setItem('user_role', data.role);
      }
      
      // Store wallet connection status in localStorage
      if (data.walletAddress) {
        localStorage.setItem('wallet_connected', 'true');
      }
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      
      return await res.json();
    },
    onSuccess: (data: SelectUser) => {
      // Update user data in cache
      queryClient.setQueryData(["user"], data);
      
      // Store role in localStorage for routing
      if (data.role) {
        localStorage.setItem('user_role', data.role);
      }
      
      // Store wallet connection status in localStorage
      if (data.walletAddress) {
        localStorage.setItem('wallet_connected', 'true');
      }
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${data.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Logout failed");
      }
    },
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(["user"], null);
      
      // Clear localStorage
      localStorage.removeItem('user_role');
      localStorage.removeItem('wallet_connected');
      
      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<SelectUser>) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Profile update failed");
      }
      
      return await res.json();
    },
    onSuccess: (data: SelectUser) => {
      // Update user data in cache
      queryClient.setQueryData(["user"], data);
      
      // Update role in localStorage if it changed
      if (data.role) {
        localStorage.setItem('user_role', data.role);
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Profile update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Connect wallet mutation
  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress }: { walletAddress: string }) => {
      const res = await fetch("/api/user/wallet/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Wallet connection failed");
      }
      
      return await res.json();
    },
    onSuccess: (data: SelectUser) => {
      // Update user data in cache
      queryClient.setQueryData(["user"], data);
      
      // Store wallet connection status in localStorage
      localStorage.setItem('wallet_connected', 'true');
      
      toast({
        title: "Wallet connected",
        description: "Your wallet has been connected successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Wallet connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
        connectWalletMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}