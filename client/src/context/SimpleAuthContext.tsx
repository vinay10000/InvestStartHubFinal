import { createContext, useState, useEffect, ReactNode } from "react";
import { 
  signup, 
  login, 
  loginWithGoogle, 
  logout, 
  observeAuthState,
  updateUserProfile
} from "@/firebase/firebaseAuth";

// Define the auth context type
interface AuthContextType {
  user: any;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, username: string, role: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the auth context
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      if (user) {
        // Try to retrieve the role from localStorage if available
        const savedRole = localStorage.getItem('user_role');
        if (savedRole) {
          // Enhance the user object with the saved role as a custom claim
          const enhancedUser = {
            ...user,
            customClaims: { role: savedRole }
          };
          setUser(enhancedUser);
        } else {
          // Default to a role if none is found
          const enhancedUser = {
            ...user,
            customClaims: { role: 'investor' }
          };
          setUser(enhancedUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Sign up with email and password
  const signUp = async (email: string, password: string, username: string, role: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create user with email and password
      const user = await signup(email, password);
      
      // Update user profile with display name
      await updateUserProfile(username);
      
      // Store the user's role in localStorage so we can retrieve it later
      // This is a simple solution until we implement Firestore
      localStorage.setItem('user_role', role);
      
      // Set custom claims in the user object (this is a client-side workaround)
      if (user) {
        // @ts-ignore - Add role to the user object
        user.customClaims = { role };
        
        // Update the state with the role included
        setUser({
          ...user,
          customClaims: { role }
        });
      }
      
      console.log(`User role set to: ${role}`);
    } catch (error: any) {
      setError(error.message || "Signup failed");
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
      await login(email, password);
    } catch (error: any) {
      setError(error.message || "Login failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginWithGoogle();
    } catch (error: any) {
      setError(error.message || "Google login failed");
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
      await logout();
    } catch (error: any) {
      setError(error.message || "Logout failed");
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}