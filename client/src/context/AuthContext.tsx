import { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";
import { User as FirebaseUser } from "firebase/auth";
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
  updateProfile: (userData: Partial<{
    username?: string;
    email?: string;
    role?: string;
    walletAddress?: string;
    profilePicture?: string;
  }>) => Promise<void>;
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
          // Get or create user directly from Firebase
          const { getFirestoreUser, createFirestoreUser } = await import("@/firebase/firestore");
          
          // Try to get existing user data
          let userData = await getFirestoreUser(firebaseUser.uid);
          
          if (!userData) {
            // User doesn't exist in Firestore, create one
            console.log("Creating new Firestore user for:", firebaseUser.email);
            await createFirestoreUser(firebaseUser.uid, {
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              role: "investor", // Default role
              profilePicture: firebaseUser.photoURL || '',
              walletAddress: '',
            });
            
            // Get the newly created user
            userData = await getFirestoreUser(firebaseUser.uid);
          }
          
          // Ensure user data has the correct id format for Firebase
          if (userData) {
            // Make sure the id field is the Firebase UID string
            userData.id = firebaseUser.uid;
            console.log("User authenticated:", userData);
          }
          
          // Set the user state with Firestore data
          setUser(userData);
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
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
      
      // Sign up using Firebase Auth
      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("@/firebase/config");
      
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create the user in Firestore
      const { createFirestoreUser } = await import("@/firebase/firestore");
      await createFirestoreUser(firebaseUser.uid, {
        username,
        email,
        role,
        walletAddress: '',
      });
      
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
      
      // Sign in using Firebase Auth
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("@/firebase/config");
      
      // Check if username is an email or just a username
      const isEmail = username.includes('@');
      
      if (isEmail) {
        // Direct login with email/password
        await signInWithEmailAndPassword(auth, username, password);
      } else {
        // TODO: For username login, we would need to query Firestore to find the user's email
        // For now, we'll assume username is always an email
        throw new Error("Please use your email address to sign in");
      }
      
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
      
      // Use the imported function for Google sign-in
      await signInWithGoogle();
      
      toast({
        title: "Signed in with Google successfully",
      });
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Error signing in with Google",
        description: error.message || "Could not sign in with Google. Please try again.",
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
      
      // Sign out using Firebase Auth
      const { signOut } = await import("firebase/auth");
      const { auth } = await import("@/firebase/config");
      
      await signOut(auth);
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
      
      // Get the current auth user
      const { auth } = await import("@/firebase/config");
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error("Firebase user not found");
      }
      
      // Convert null walletAddress to empty string if needed
      const updatedData = { ...userData };
      if (updatedData.walletAddress === null) {
        updatedData.walletAddress = '';
      }
      
      // Update user in Firestore
      const { updateFirestoreUser } = await import("@/firebase/firestore");
      await updateFirestoreUser(currentUser.uid, updatedData);
      
      // Get the updated user data
      const { getFirestoreUser } = await import("@/firebase/firestore");
      const updatedUser = await getFirestoreUser(currentUser.uid);
      
      setUser(updatedUser);
      
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
      
      // Get the current auth user
      const { auth } = await import("@/firebase/config");
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error("Firebase user not found");
      }
      
      // Update user wallet in Firestore
      const { updateFirestoreUser } = await import("@/firebase/firestore");
      await updateFirestoreUser(currentUser.uid, { walletAddress });
      
      // Get the updated user data
      const { getFirestoreUser } = await import("@/firebase/firestore");
      const updatedUser = await getFirestoreUser(currentUser.uid);
      
      setUser(updatedUser);
      
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
