import { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  signOut as firebaseSignOut,
  onAuthChange 
} from "@/firebase/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, role: "founder" | "investor") => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  connectWallet: (walletAddress: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  connectWallet: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is authenticated on mount
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        try {
          // Get user from our backend
          const response = await apiRequest("GET", `/api/user/profile?userId=${firebaseUser.uid}`, undefined);
          const userData = await response.json();
          setUser(userData.user);
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string, role: "founder" | "investor") => {
    try {
      setLoading(true);
      await signUpWithEmail(email, password, username, role);
      toast({
        title: "Account created successfully",
        description: "You are now signed in.",
      });
    } catch (error: any) {
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmail(username, password);
      toast({
        title: "Signed in successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      toast({
        title: "Signed in with Google successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error signing in with Google",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await firebaseSignOut();
      setUser(null);
      toast({
        title: "Signed out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const response = await apiRequest("PUT", "/api/user/profile", {
        id: user.id,
        ...userData,
      });
      
      const updatedUserData = await response.json();
      setUser(updatedUserData.user);
      
      toast({
        title: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const connectWallet = async (walletAddress: string) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      const response = await apiRequest("POST", "/api/user/wallet/connect", {
        userId: user.id,
        walletAddress,
      });
      
      const updatedUserData = await response.json();
      setUser(updatedUserData.user);
      
      toast({
        title: "Wallet connected successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error connecting wallet",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signInWithGoogle: googleSignIn,
        signOut: logout,
        updateProfile,
        connectWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
