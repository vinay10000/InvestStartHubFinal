// Import types from Firebase auth but implement with our mock
import type { 
  UserCredential,
  User as FirebaseUser
} from "firebase/auth";

// Import our auth mock 
import { auth } from "./config";
import { apiRequest } from "@/lib/queryClient";
import { getUserByUid, updateUser } from "./database";

// Export auth functions that are used by components
export { auth };

// Create a mock of onAuthStateChanged function
export const onAuthStateChanged = (auth: any, callback: (user: any) => void): (() => void) => {
  console.log("[Auth Mock] onAuthStateChanged registered");
  
  // Call the callback immediately with the current user (or null)
  setTimeout(() => {
    callback(auth.currentUser);
  }, 100);
  
  // Mock unsubscribe function
  return () => {
    console.log("[Auth Mock] onAuthStateChanged unsubscribed");
  };
};

// Create a default avatar URL based on initials
const createDefaultAvatar = (name: string) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=256`;
};

// Sign up with email/password - MongoDB version
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  username: string, 
  role: "founder" | "investor",
  walletAddress?: string
): Promise<UserCredential> => {
  try {
    console.log(`⭐ IMPORTANT: Creating new user account for ${email} with ROLE "${role.toUpperCase()}"`);
    
    // Normalize role
    const normalizedRole = role.toLowerCase();
    
    // Generate a default profile picture
    const profilePicture = createDefaultAvatar(username);
    
    // Create user in MongoDB via API instead of Firebase
    const response = await apiRequest("POST", "/api/register", {
      username,
      email,
      password,
      role: normalizedRole,
      walletAddress: walletAddress || "",
      profilePicture
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to register user");
    }
    
    // Get the user data from the response
    const userData = await response.json();
    
    // Create a fake UserCredential object to match Firebase's API
    const mockUser = {
      uid: userData.id.toString(),
      email: userData.email,
      displayName: userData.username,
      photoURL: userData.profilePicture,
      emailVerified: false,
      isAnonymous: false,
      metadata: {
        creationTime: new Date().toString(),
        lastSignInTime: new Date().toString()
      },
      providerData: [],
      refreshToken: "",
      tenantId: null,
      delete: () => Promise.resolve(),
      getIdToken: () => Promise.resolve("mock-token"),
      getIdTokenResult: () => Promise.resolve({
        token: "mock-token",
        authTime: new Date().toString(),
        issuedAtTime: new Date().toString(),
        expirationTime: new Date(Date.now() + 3600000).toString(),
        claims: { role: normalizedRole }
      }),
      reload: () => Promise.resolve(),
      toJSON: () => ({ uid: userData.id.toString() })
    };
    
    // Set current user in auth object
    auth.currentUser = mockUser;
    
    // Create mock UserCredential
    const userCredential = {
      user: mockUser,
      providerId: null,
      operationType: "signIn" as const
    };
    
    if (walletAddress) {
      console.log("User created with wallet address:", walletAddress);
      localStorage.setItem('wallet_connected', 'true');
    }
    
    console.log("User created successfully in MongoDB:", userData.id, "with role:", normalizedRole);
    
    // Store normalized role in localStorage for immediate availability across components
    localStorage.setItem('user_role', normalizedRole);
    console.log("⭐ IMPORTANT: Saved user role to localStorage during signup:", normalizedRole);
    
    return userCredential;
  } catch (error) {
    console.error("Error in signup process:", error);
    throw error;
  }
};

// Sign in with email/password - MongoDB version
export const signInWithEmail = async (
  email: string, 
  password: string
): Promise<UserCredential> => {
  try {
    console.log(`Signing in user with email ${email}`);
    
    // Sign in using MongoDB API instead of Firebase
    const response = await apiRequest("POST", "/api/login", {
      username: email, // The server accepts either username or email in this field
      password
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to login");
    }
    
    // Get the user data from the response
    const userData = await response.json();
    
    console.log("User authenticated successfully with MongoDB:", userData.id);
    
    // Create a fake UserCredential object to match Firebase's API
    const mockUser = {
      uid: userData.id.toString(),
      email: userData.email,
      displayName: userData.username,
      photoURL: userData.profilePicture || createDefaultAvatar(userData.username),
      emailVerified: false,
      isAnonymous: false,
      metadata: {
        creationTime: userData.createdAt || new Date().toString(),
        lastSignInTime: new Date().toString()
      },
      providerData: [],
      refreshToken: "",
      tenantId: null,
      delete: () => Promise.resolve(),
      getIdToken: () => Promise.resolve("mock-token"),
      getIdTokenResult: () => Promise.resolve({
        token: "mock-token",
        authTime: new Date().toString(),
        issuedAtTime: new Date().toString(),
        expirationTime: new Date(Date.now() + 3600000).toString(),
        claims: { role: userData.role }
      }),
      reload: () => Promise.resolve(),
      toJSON: () => ({ uid: userData.id.toString() })
    };
    
    // Set current user in auth object
    auth.currentUser = mockUser;
    
    // Create mock UserCredential
    const userCredential = {
      user: mockUser,
      providerId: null,
      operationType: "signIn" as const
    };
    
    // Store user's role in localStorage
    if (userData.role) {
      localStorage.setItem('user_role', userData.role);
      console.log("Saved user role to localStorage during sign-in:", userData.role);
    }
    
    // Store wallet connection status if user has a wallet
    if (userData.walletAddress) {
      localStorage.setItem('wallet_connected', 'true');
    }
    
    return userCredential;
  } catch (error) {
    console.error("Error in signin process:", error);
    throw error;
  }
};

// Mock Google auth provider
class MockGoogleAuthProvider {
  scopes: string[] = [];
  customParameters: Record<string, string> = {};
  
  addScope(scope: string) {
    this.scopes.push(scope);
    return this;
  }
  
  setCustomParameters(params: Record<string, string>) {
    this.customParameters = params;
    return this;
  }
  
  static credential() {
    return {};
  }
}

// Mock Google sign-in function - MongoDB version
export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    console.log("Starting Google sign-in process");
    
    // This is a mock implementation that simply redirects to email/password login
    // since Google OAuth requires a real Google account.
    // In real implementation, we'd call MongoDB with Google OAuth token
    
    alert("Google Sign-in is not available in the migrated MongoDB version.\nPlease use email/password login instead.");
    
    throw new Error("Google sign-in not available in MongoDB version");
  } catch (error) {
    console.error("Error in Google sign-in process:", error);
    throw error;
  }
};

// Export mock Google provider for components that need it
export const GoogleAuthProvider = MockGoogleAuthProvider;

// Sign out - MongoDB version
export const signOut = async (): Promise<void> => {
  try {
    console.log("Attempting to sign out user");
    
    // Update online status to false before signing out
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log("Updating last active status for user:", currentUser.uid);
      
      // Call the MongoDB logout API
      await apiRequest("POST", "/api/logout", {});
    }
    
    // Clear localStorage values related to authentication
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('user_role');
    console.log("Cleared wallet_connected and user_role from localStorage during sign-out");
    
    // Clear current user
    auth.currentUser = null;
    
    return Promise.resolve();
  } catch (error) {
    console.error("Error during sign out:", error);
    // Clear localStorage values before attempting sign-out again
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('user_role');
    console.log("Cleared localStorage during sign-out error recovery");
    
    // Make sure user is cleared even if the logout API call failed
    auth.currentUser = null;
    
    return Promise.resolve();
  }
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: FirebaseUser | null) => void): () => void => {
  console.log("Setting up auth state change listener");
  return onAuthStateChanged(auth, (user) => {
    console.log("Auth state changed, user:", user ? user.uid : "signed out");
    callback(user);
  });
};
