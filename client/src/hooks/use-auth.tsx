import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Define User type matching what we expect from MongoDB
export type User = {
  id: number;
  username: string;
  email: string;
  password: string;
  role: string;
  walletAddress: string | null;
  profilePicture: string | null;
  sameId: string | null;
  createdAt: Date | null;
};

// Define types for login/register data
export type LoginData = {
  username: string;
  password: string;
};

export type RegisterData = {
  username: string;
  email: string;
  password: string;
  role: string;
};

// Define the auth context type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

// Create the auth context
export const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  
  // Query to fetch the current authenticated user
  const {
    data: userData,
    error,
    isLoading,
    refetch,
  } = useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) {
        if (res.status === 401) {
          return null;
        }
        throw new Error(`Failed to fetch user: ${res.statusText}`);
      }
      return await res.json();
    },
    retry: false,
  });
  
  // Update user state when userData changes
  useEffect(() => {
    if (userData) {
      setUser(userData);
    } else {
      setUser(null);
    }
  }, [userData]);

  // Login mutation
  const loginMutation = useMutation<User, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        throw new Error(`Login failed: ${res.statusText}`);
      }
      
      return await res.json();
    },
    onSuccess: (userData) => {
      setUser(userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.username}!`,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: async (data: RegisterData) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error(`Registration failed: ${res.statusText}`);
      }
      
      return await res.json();
    },
    onSuccess: (userData) => {
      setUser(userData);
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.username}!`,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
      });
      
      if (!res.ok) {
        throw new Error(`Logout failed: ${res.statusText}`);
      }
    },
    onSuccess: () => {
      setUser(null);
      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Provide the auth context
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}