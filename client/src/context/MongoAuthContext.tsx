import React, { createContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Define the User type based on MongoDB schema
export interface MongoUser {
  id: number;
  username: string;
  email: string;
  role: string;
  walletAddress: string | null;
  profilePicture: string | null;
  createdAt: string | null;
}

// Define the auth context type
interface AuthContextType {
  user: MongoUser | null;
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string, username: string, role: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<MongoUser>) => Promise<void>;
  connectWallet: (walletAddress: string) => Promise<void>;
}

// Create the auth context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  error: null,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  connectWallet: async () => {},
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MongoUser | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user');
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Not authenticated or server error
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Sign up with email and password
  const signUp = async (email: string, password: string, username: string, role: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest("POST", "/api/register", {
        email,
        password,
        username,
        role
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }
      
      const userData = await response.json();
      setUser(userData);
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.username}!`,
      });
      
    } catch (error: any) {
      setError(error.message || "Registration failed");
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest("POST", "/api/login", {
        username: email, // Using email as username for compatibility
        password
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Authentication failed");
      }
      
      const userData = await response.json();
      setUser(userData);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.username}!`,
      });
      
    } catch (error: any) {
      setError(error.message || "Login failed");
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest("POST", "/api/logout", {});
      
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      
      setUser(null);
      
      // Clear all query cache to ensure no protected data remains
      queryClient.clear();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      
    } catch (error: any) {
      setError(error.message || "Logout failed");
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (data: Partial<MongoUser>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error("You must be logged in to update your profile");
      }
      
      const response = await apiRequest("PUT", "/api/user/profile", data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }
      
      const updatedUser = await response.json();
      setUser(updatedUser);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      
    } catch (error: any) {
      setError(error.message || "Failed to update profile");
      toast({
        title: "Profile update failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Connect wallet
  const connectWallet = async (walletAddress: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error("You must be logged in to connect a wallet");
      }
      
      const response = await apiRequest("POST", "/api/wallets/connect", {
        userId: user.id,
        walletAddress
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to connect wallet");
      }
      
      const updatedUser = await response.json();
      setUser(updatedUser);
      
      toast({
        title: "Wallet connected",
        description: "Your wallet has been successfully connected to your account",
      });
      
    } catch (error: any) {
      setError(error.message || "Failed to connect wallet");
      toast({
        title: "Wallet connection failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    isLoading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    connectWallet
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}