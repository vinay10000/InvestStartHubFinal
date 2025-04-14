import { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";
import { User as FirebaseUser } from "firebase/auth";
import { 
  signUpWithEmail as firebaseSignUpWithEmail, 
  signInWithEmail as firebaseSignInWithEmail, 
  signInWithGoogle as firebaseSignInWithGoogle, 
  signOut as firebaseSignOut,
  onAuthChange 
} from "@/firebase/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { updateFirestoreUser, getFirestoreUser } from "@/firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, role: "founder" | "investor") => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (userData: Partial<{
    username?: string;
    email?: string;
    role?: string;
    walletAddress?: string;
    profilePicture?: string;
  }>) => Promise<void>;
  connectWallet: (walletAddress: string) => Promise<void>;
}

const DEFAULT_AUTH_CONTEXT: AuthContextType = {
  user: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  connectWallet: async () => {},
};

export const AuthContext = createContext<AuthContextType>(DEFAULT_AUTH_CONTEXT);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Function to synchronize user data from Firebase to context
  const synchronizeUserData = async (firebaseUser: FirebaseUser) => {
    try {
      console.log("Synchronizing user data for:", firebaseUser.uid);
      // Get user data from Firestore
      const userData = await getFirestoreUser(firebaseUser.uid);
      
      if (userData) {
        // Convert Firebase data format to our User type
        // Temporarily modify the type to handle Firebase string IDs alongside schema's number IDs
        const formattedUser = {
          // Use a numeric id for now to satisfy the schema
          id: 1,  // Temporary ID, will be properly assigned by backend
          username: userData.username || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: userData.email || firebaseUser.email || '',
          profilePicture: userData.profilePicture || firebaseUser.photoURL || '',
          role: userData.role || 'investor',
          walletAddress: userData.walletAddress || '',
          createdAt: userData.createdAt || new Date(),
          // Store Firebase UID separately for reference
          firebaseUid: firebaseUser.uid
        } as unknown as User;
        
        console.log("Setting user state with:", formattedUser);
        setUser(formattedUser);
        return formattedUser;
      } else {
        console.error("No user data found in Firestore for:", firebaseUser.uid);
        return null;
      }
    } catch (error) {
      console.error("Error synchronizing user data:", error);
      return null;
    }
  };

  // Check if user is authenticated on mount
  useEffect(() => {
    console.log("Setting up auth state listener");
    setLoading(true);
    
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? firebaseUser.uid : "null");
      
      if (firebaseUser) {
        try {
          const userData = await synchronizeUserData(firebaseUser);
          
          if (userData) {
            // Successfully synchronized user data
            toast({
              title: "Authenticated",
              description: `Welcome, ${userData.username}!`,
            });
          } else {
            // User data could not be synchronized
            setUser(null);
          }
        } catch (error) {
          console.error("Error handling auth change:", error);
          setUser(null);
        }
      } else {
        console.log("No firebase user - signed out");
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => {
      console.log("Cleaning up auth state listener");
      unsubscribe();
    };
  }, [toast]);

  // Sign up with email and password
  const signUp = async (email: string, password: string, username: string, role: "founder" | "investor") => {
    try {
      setLoading(true);
      console.log("Starting signup process in AuthContext:", { email, username, role });
      
      // Using the refactored Firebase auth function
      const result = await firebaseSignUpWithEmail(email, password, username, role);
      console.log("Signup successful, Firebase user created:", result.user.uid);
      
      // Force synchronization after signup
      await synchronizeUserData(result.user);
      
      toast({
        title: "Account created successfully",
        description: "You are now signed in.",
      });
    } catch (error: any) {
      console.error("Error in signUp:", error);
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

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log("Starting signin process in AuthContext:", { email });
      
      // Check if input is an email or username
      const isEmail = email.includes('@');
      
      if (isEmail) {
        // Using the refactored Firebase auth function
        const result = await firebaseSignInWithEmail(email, password);
        console.log("Signin successful, Firebase user authenticated:", result.user.uid);
        
        // Force synchronization after signin
        await synchronizeUserData(result.user);
        
        toast({
          title: "Signed in successfully",
        });
      } else {
        throw new Error("Please use your email address to sign in");
      }
    } catch (error: any) {
      console.error("Error in signIn:", error);
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

  // Sign in with Google
  const googleSignIn = async () => {
    try {
      setLoading(true);
      console.log("Starting Google signin process in AuthContext");
      
      // Using the refactored Firebase auth function
      const result = await firebaseSignInWithGoogle();
      console.log("Google signin successful, Firebase user authenticated:", result.user.uid);
      
      // Force synchronization after Google signin
      await synchronizeUserData(result.user);
      
      toast({
        title: "Signed in with Google successfully",
      });
    } catch (error: any) {
      console.error("Error in googleSignIn:", error);
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

  // Sign out
  const logout = async () => {
    try {
      setLoading(true);
      console.log("Starting signout process in AuthContext");
      
      // Using the refactored Firebase auth function
      await firebaseSignOut();
      
      // Clear user state immediately
      setUser(null);
      
      toast({
        title: "Signed out successfully",
      });
    } catch (error: any) {
      console.error("Error in logout:", error);
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (userData: Partial<{
    username?: string;
    email?: string;
    role?: string;
    walletAddress?: string;
    profilePicture?: string;
  }>) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      console.log("Updating user profile:", userData);
      
      // Get the current auth user
      const { auth } = await import("@/firebase/config");
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error("Firebase user not found");
      }
      
      // Sanitize data
      const updatedData = { ...userData };
      if (updatedData.walletAddress === null) {
        updatedData.walletAddress = '';
      }
      
      // Update user in Firestore
      await updateFirestoreUser(currentUser.uid, updatedData);
      
      // Force synchronization to get updated user data
      await synchronizeUserData(currentUser);
      
      toast({
        title: "Profile updated successfully",
      });
    } catch (error: any) {
      console.error("Error in updateProfile:", error);
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Connect wallet
  const connectWallet = async (walletAddress: string) => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      console.log("Connecting wallet:", walletAddress);
      
      // Get the current auth user
      const { auth } = await import("@/firebase/config");
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error("Firebase user not found");
      }
      
      // Update user wallet in Firestore
      await updateFirestoreUser(currentUser.uid, { walletAddress });
      
      // Force synchronization to get updated user data
      await synchronizeUserData(currentUser);
      
      toast({
        title: "Wallet connected successfully",
      });
    } catch (error: any) {
      console.error("Error in connectWallet:", error);
      toast({
        title: "Error connecting wallet",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Expose the context value
  const contextValue: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle: googleSignIn,
    signOut: logout,
    updateProfile,
    connectWallet,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
