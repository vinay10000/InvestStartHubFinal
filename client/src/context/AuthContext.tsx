import { createContext, useState, useEffect, ReactNode } from "react";
import { User as SchemaUser } from "@shared/schema";

// Extend the User type to include MongoDB ID mapped as UID for compatibility
interface User extends SchemaUser {
  uid: string; // MongoDB ID mapped as UID for compatibility
}

// Import the User type from MongoDB auth module instead of redefining it
import { User as MongoUser } from "../mongodb/auth";
import { 
  signUpWithEmail as mongoSignUpWithEmail, 
  signInWithEmail as mongoSignInWithEmail, 
  signInWithGoogle as mongoSignInWithGoogle, 
  signOut as mongoSignOut,
  onAuthChange 
} from "../mongodb/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Use MongoDB database adapter instead of Firebase
import { getUserByUid, updateUser } from "../mongodb/database";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, role: "founder" | "investor", walletAddress?: string) => Promise<void>;
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

  // Function to synchronize user data from MongoDB to context
  const synchronizeUserData = async (mongoUser: MongoUser) => {
    try {
      console.log("Synchronizing user data for:", mongoUser.uid);
      // Get user data from MongoDB
      const userData = await getUserByUid(mongoUser.uid);
      
      if (userData) {
        console.log("Found user data in MongoDB:", userData);
        // Convert MongoDB data format to our User type
        // We need to maintain both the schema's numeric id and the string id
        const formattedUser = {
          // Use the actual ID if present, or a temporary one
          id: userData.id || mongoUser.uid,
          // Store the UID directly in the user object to make it available everywhere
          uid: mongoUser.uid,
          username: userData.username || mongoUser.displayName || mongoUser.email?.split('@')[0] || 'User',
          email: userData.email || mongoUser.email || '',
          profilePicture: userData.profilePicture || mongoUser.photoURL || '',
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
        console.log("No existing user data found in MongoDB. Creating new user data...");
        
        // Create a new user in MongoDB
        const newUser = {
          uid: mongoUser.uid,
          email: mongoUser.email || '',
          username: mongoUser.displayName || mongoUser.email?.split('@')[0] || 'User',
          profilePicture: mongoUser.photoURL || '',
          role: 'investor', // Default role
          walletAddress: '',
          // No need to include createdAt as it will be set on the server
        };
        
        // Save the new user to MongoDB
        const savedUser = await updateUser(mongoUser.uid, newUser);
        console.log("Created new user in MongoDB:", savedUser);
        
        // Format the user for the context
        const formattedUser = {
          id: mongoUser.uid,
          uid: mongoUser.uid,
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
      // from the MongoDB authentication data to allow basic functionality
      const minimalUser = {
        id: mongoUser.uid,
        uid: mongoUser.uid,
        username: mongoUser.displayName || mongoUser.email?.split('@')[0] || 'User',
        email: mongoUser.email || '',
        profilePicture: mongoUser.photoURL || '',
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
    
    const unsubscribe = onAuthChange(async (mongoUser) => {
      console.log("Auth state changed:", mongoUser ? mongoUser.uid : "null");
      
      if (mongoUser) {
        try {
          const userData = await synchronizeUserData(mongoUser);
          
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
        console.log("No MongoDB user - signed out");
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
  const signUp = async (email: string, password: string, username: string, role: "founder" | "investor", walletAddress?: string) => {
    try {
      setLoading(true);
      console.log("Starting signup process in AuthContext:", { email, username, role, walletAddress });
      
      // Using the MongoDB auth function with wallet address
      const result = await mongoSignUpWithEmail(email, password, username, role, walletAddress);
      console.log("Signup successful, MongoDB user created:", result.uid);
      
      // Force synchronization after signup
      await synchronizeUserData(result.user);
      
      const toastDescription = walletAddress 
        ? "Account created successfully with wallet address." 
        : "You are now signed in. Please connect your wallet to continue.";
      
      toast({
        title: "Account created successfully",
        description: toastDescription,
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
        // Using the MongoDB auth function
        const result = await mongoSignInWithEmail(email, password);
        console.log("Signin successful, MongoDB user authenticated:", result.uid);
        
        // Force synchronization after signin
        const userData = await synchronizeUserData(result);
        
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
      
      // Using the MongoDB auth function
      const result = await mongoSignInWithGoogle();
      console.log("Google signin successful, MongoDB user authenticated:", result.uid);
      
      // Force synchronization after Google signin
      const userData = await synchronizeUserData(result);
      
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
      
      // Using the MongoDB auth function
      await mongoSignOut();
      
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
      
      // Get user ID from current user
      const userId = user.uid || user.id?.toString();
      
      if (!userId) {
        throw new Error("User ID not found");
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
      
      // Update user in MongoDB
      await updateUser(userId, updatedData);
      
      // Create a minimal MongoDB user object for synchronization
      const mongoUser: MongoUser = {
        uid: userId,
        email: user.email,
        displayName: user.username,
        photoURL: user.profilePicture
      };
      
      // Force synchronization to get updated user data
      await synchronizeUserData(mongoUser);
      
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
      
      console.log("[AuthContext] Connecting wallet:", walletAddress);
      
      // Get user ID from current user
      const userId = user.uid || user.id?.toString();
      
      if (!userId) {
        throw new Error("User ID not found");
      }
      
      // Update user wallet in MongoDB
      console.log("[AuthContext] Updating user profile with wallet address:", walletAddress);
      await updateUser(userId, { walletAddress });
      
      // Also save to our dedicated wallet database for cross-referencing
      const { saveWalletAddress, migrateWalletToMongoUid } = await import("@/mongodb/walletDatabase");
      
      try {
        console.log("[AuthContext] Saving wallet address to dedicated wallet database");
        
        // Store wallet address associated with MongoDB UID
        await saveWalletAddress(
          userId, 
          walletAddress, 
          user.username || '', 
          user.role || ''
        );
        
        // If we have a numeric user ID that's different from the string ID, migrate it
        if (user.id && typeof user.id === 'number' && user.id.toString() !== userId) {
          console.log("[AuthContext] Also migrating from numeric ID to MongoDB ID:", 
            { numericId: user.id.toString(), mongoId: userId });
          
          await migrateWalletToMongoUid(
            user.id.toString(), 
            userId,
            walletAddress
          );
        }
        
        // Also look for any old numeric IDs and migrate them
        // This ensures backward compatibility with wallets saved with old ID formats
        const commonNumericIds = ["1", "2", "3", "4", "5", "10"];
        for (const numericId of commonNumericIds) {
          try {
            // Try to migrate any existing wallets with these IDs to the MongoDB ID
            await migrateWalletToMongoUid(
              numericId,
              userId,
              walletAddress
            );
          } catch (migrationError) {
            // Silently ignore migration errors - it's just a helpful extra step
            console.log(`[AuthContext] Migration attempt from ID ${numericId} didn't apply:`, 
              migrationError instanceof Error ? migrationError.message : 'Unknown error');
          }
        }
        
        console.log("[AuthContext] Wallet saved to both user profile and wallet database");
      } catch (walletError) {
        console.error("[AuthContext] Error saving to wallet database:", walletError);
        // Continue even if wallet DB save fails - we still have the user profile update
      }
      
      // Set the wallet connected flag in localStorage
      localStorage.setItem('wallet_connected', 'true');
      
      // Create a minimal MongoDB user object for synchronization
      const mongoUser: MongoUser = {
        uid: userId,
        email: user.email,
        displayName: user.username,
        photoURL: user.profilePicture
      };
      
      // Force synchronization to get updated user data
      await synchronizeUserData(mongoUser);
      
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
      
      // Get user ID from current user
      const userId = user.uid || user.id?.toString();
      
      if (!userId) {
        throw new Error("User ID not found");
      }
      
      // Save current wallet address for cleanup
      const oldWalletAddress = user.walletAddress;
      
      // Update user wallet in MongoDB with empty string
      await updateUser(userId, { walletAddress: '' });
      
      // Also remove from our dedicated wallet database for cross-referencing
      if (oldWalletAddress) {
        try {
          const { deleteWallet } = await import("@/mongodb/walletDatabase");
          
          // Remove wallet associated with the user ID
          await deleteWallet(userId);
          
          // If we have a numeric user ID that's different, also remove that entry
          if (user.id && typeof user.id === 'number' && user.id.toString() !== userId) {
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
      
      // Create a minimal MongoDB user object for synchronization
      const mongoUser: MongoUser = {
        uid: userId,
        email: user.email,
        displayName: user.username,
        photoURL: user.profilePicture
      };
      
      // Force synchronization to get updated user data
      await synchronizeUserData(mongoUser);
      
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
