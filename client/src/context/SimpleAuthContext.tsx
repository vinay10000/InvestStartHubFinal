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
    console.log("Setting up auth state listener");
    const unsubscribe = observeAuthState((user) => {
      if (user) {
        console.log("Auth state changed, user:", user.email);
        
        // Try to retrieve the role from localStorage if available
        const savedRole = localStorage.getItem('user_role');
        console.log("Retrieved role from localStorage:", savedRole);
        
        if (savedRole) {
          // Enhance the user object with the saved role as a custom claim
          const enhancedUser = {
            ...user,
            customClaims: { role: savedRole }
          };
          setUser(enhancedUser);
          console.log("Set user with role:", savedRole);
        } else {
          // If no role is found, default to investor and save it
          const defaultRole = 'investor';
          localStorage.setItem('user_role', defaultRole);
          
          const enhancedUser = {
            ...user,
            customClaims: { role: defaultRole }
          };
          setUser(enhancedUser);
          console.log("No role found, defaulting to:", defaultRole);
        }
      } else {
        console.log("Auth state changed: signed out");
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
      
      // Login with Firebase
      const userCredential = await login(email, password);
      
      // After login, check if user has a role saved in the database
      // For now, we'll just retrieve from localStorage
      const savedRole = localStorage.getItem('user_role');
      
      // If no role is found, we need to determine it
      if (!savedRole) {
        // Try to detect if this user is a founder based on their email pattern
        // This is a simple heuristic that can be replaced with a proper DB lookup
        const isFounder = email.includes('founder') || email.includes('startup');
        const defaultRole = isFounder ? 'founder' : 'investor';
        
        // Store the detected role
        localStorage.setItem('user_role', defaultRole);
        console.log(`No role found for user, defaulting to: ${defaultRole}`);
      } else {
        console.log(`Using saved role for user: ${savedRole}`);
      }
      
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