import { createContext, useState, useEffect, ReactNode } from "react";
import { User as SchemaUser } from "@shared/schema";
import { User as FirebaseUser } from "firebase/auth";

// Extend the User type to include Firebase UID
interface User extends SchemaUser {
  uid: string; // Firebase UID for direct access
}
import { 
  signUpWithEmail as firebaseSignUpWithEmail, 
  signInWithEmail as firebaseSignInWithEmail, 
  signInWithGoogle as firebaseSignInWithGoogle, 
  signOut as firebaseSignOut,
  onAuthChange 
} from "@/firebase/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Use Firebase Realtime Database instead of Firestore for consistency
import { getUserByUid, updateUser } from "@/firebase/database";

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
  disconnectWallet: () => Promise<void>;
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
  disconnectWallet: async () => {},
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
      // Get user data from Firebase Realtime Database
      const userData = await getUserByUid(firebaseUser.uid);
      
      if (userData) {
        console.log("Found user data in Firebase Realtime DB:", userData);
        // Convert Firebase data format to our User type
        // We need to maintain both the schema's numeric id and the Firebase string id
        const formattedUser = {
          // Use the actual ID if present, or a temporary one
          id: userData.id || firebaseUser.uid,
          // Store the Firebase UID directly in the user object to make it available everywhere
          uid: firebaseUser.uid,
          username: userData.username || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: userData.email || firebaseUser.email || '',
          profilePicture: userData.profilePicture || firebaseUser.photoURL || '',
          role: userData.role || 'investor',
          walletAddress: userData.walletAddress || '',
          createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        } as unknown as User;
        
        // Store user role in localStorage for consistent routing
        localStorage.setItem('user_role', formattedUser.role);
        
        console.log("Setting user state with:", formattedUser, "Role saved to localStorage:", formattedUser.role);
        setUser(formattedUser);
        return formattedUser;
      } else {
        console.log("No existing user data found in Firebase database. Creating new user data...");
        
        // Create a new user in Firebase Realtime Database
        const newUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          profilePicture: firebaseUser.photoURL || '',
          role: 'investor', // Default role
          walletAddress: '',
          createdAt: new Date().toISOString()
        };
        
        // Save the new user to Firebase
        const savedUser = await updateUser(firebaseUser.uid, newUser);
        console.log("Created new user in Firebase Realtime DB:", savedUser);
        
        // Format the user for the context
        const formattedUser = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          username: newUser.username,
          email: newUser.email,
          profilePicture: newUser.profilePicture,
          role: newUser.role,
          walletAddress: newUser.walletAddress,
          createdAt: new Date(),
        } as unknown as User;
        
        // Store user role in localStorage for consistent routing
        localStorage.setItem('user_role', formattedUser.role);
        
        console.log("Setting new user state with:", formattedUser, "Role saved to localStorage:", formattedUser.role);
        setUser(formattedUser);
        return formattedUser;
      }
    } catch (error) {
      console.error("Error synchronizing user data:", error);
      // Even if there's an error with the database, we can still create a minimal user object
      // from the Firebase authentication data to allow basic functionality
      const minimalUser = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || '',
        profilePicture: firebaseUser.photoURL || '',
        role: 'investor', // Default role
        walletAddress: '',
        createdAt: new Date(),
      } as unknown as User;
      
      // Store user role in localStorage for consistent routing
      localStorage.setItem('user_role', minimalUser.role);
      
      console.log("Setting minimal user state due to error:", minimalUser, "Role saved to localStorage:", minimalUser.role);
      setUser(minimalUser);
      return minimalUser;
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
        description: "You are now signed in. Please connect your wallet to continue.",
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
        const userData = await synchronizeUserData(result.user);
        
        // Check if user has a wallet connected
        const hasWallet = userData.walletAddress && userData.walletAddress !== '';
        
        if (hasWallet) {
          toast({
            title: "Signed in successfully",
          });
        } else {
          toast({
            title: "Signed in successfully",
            description: "Please connect your wallet to continue using the platform.",
          });
        }
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
      const userData = await synchronizeUserData(result.user);
      
      // Check if user has a wallet connected
      const hasWallet = userData.walletAddress && userData.walletAddress !== '';
      
      if (hasWallet) {
        toast({
          title: "Signed in with Google successfully",
        });
      } else {
        toast({
          title: "Signed in with Google successfully",
          description: "Please connect your wallet to continue using the platform.",
        });
      }
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
      
      // Clear localStorage values related to authentication
      localStorage.removeItem('wallet_connected');
      localStorage.removeItem('user_role');
      console.log("AuthContext: Cleared wallet_connected and user_role from localStorage during logout");
      
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
      
      // Update role in localStorage if it's being changed
      if (updatedData.role) {
        localStorage.setItem('user_role', updatedData.role);
        console.log("AuthContext: Updated user_role in localStorage:", updatedData.role);
      }
      
      // Update user in Firebase Realtime Database
      await updateUser(currentUser.uid, updatedData);
      
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
      
      // Update user wallet in Firebase Realtime Database
      await updateUser(currentUser.uid, { walletAddress });
      
      // Also save to our dedicated wallet database for cross-referencing
      const { saveWalletAddress } = await import("@/firebase/walletDatabase");
      
      try {
        // Store wallet address associated with both numeric ID and UID
        await saveWalletAddress(
          currentUser.uid, 
          walletAddress, 
          user.username || '', 
          user.role || ''
        );
        
        // If we have a numeric user ID, also store with that to ensure lookup works
        if (user.id && user.id.toString() !== currentUser.uid) {
          await saveWalletAddress(
            user.id.toString(), 
            walletAddress, 
            user.username || '', 
            user.role || ''
          );
        }
        
        console.log("[AuthContext] Wallet saved to both user profile and wallet database");
      } catch (walletError) {
        console.error("[AuthContext] Error saving to wallet database:", walletError);
        // Continue even if wallet DB save fails - we still have the user profile update
      }
      
      // Set the wallet connected flag in localStorage
      localStorage.setItem('wallet_connected', 'true');
      
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
  
  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }
      
      console.log("Disconnecting wallet");
      
      // Get the current auth user
      const { auth } = await import("@/firebase/config");
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error("Firebase user not found");
      }
      
      // Save current wallet address for cleanup
      const oldWalletAddress = user.walletAddress;
      
      // Update user wallet in Firebase Realtime Database with empty string
      await updateUser(currentUser.uid, { walletAddress: '' });
      
      // Also remove from our dedicated wallet database for cross-referencing
      if (oldWalletAddress) {
        try {
          const { deleteWallet } = await import("@/firebase/walletDatabase");
          
          // Remove wallet associated with both UID and ID
          await deleteWallet(currentUser.uid);
          
          // If we have a numeric user ID, also remove that entry
          if (user.id && user.id.toString() !== currentUser.uid) {
            await deleteWallet(user.id.toString());
          }
          
          console.log("[AuthContext] Wallet removed from wallet database");
        } catch (walletError) {
          console.error("[AuthContext] Error removing from wallet database:", walletError);
          // Continue even if wallet DB deletion fails
        }
      }
      
      // Remove the wallet connected flag from localStorage
      localStorage.removeItem('wallet_connected');
      
      // Force synchronization to get updated user data
      await synchronizeUserData(currentUser);
      
      toast({
        title: "Wallet disconnected successfully",
      });
    } catch (error: any) {
      console.error("Error in disconnectWallet:", error);
      toast({
        title: "Error disconnecting wallet",
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
    disconnectWallet,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
