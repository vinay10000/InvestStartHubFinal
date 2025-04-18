import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from "firebase/auth";
import { auth } from "./config";
import { apiRequest } from "@/lib/queryClient";
import { getUserByUid, updateUser } from "./database";

// Create a default avatar URL based on initials
const createDefaultAvatar = (name: string) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=256`;
};

// Sign up with email/password
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  username: string, 
  role: "founder" | "investor",
  walletAddress?: string
): Promise<UserCredential> => {
  try {
    console.log(`⭐ IMPORTANT: Creating new user account for ${email} with ROLE "${role.toUpperCase()}"`);
    
    // Create firebase auth user first
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Force role to lowercase for consistency
    const normalizedRole = role.toLowerCase();
    
    // Generate a default profile picture
    const profilePicture = createDefaultAvatar(username);
    
    // Set display name and photoURL in Firebase Auth
    await updateProfile(user, {
      displayName: username,
      photoURL: profilePicture
    });
    
    console.log("Updated user profile in Firebase Auth with displayName and photoURL");
    
    // Create user in Firebase Realtime Database with normalized role
    await updateUser(user.uid, {
      username,
      email,
      role: normalizedRole, // Use normalized role here
      walletAddress: walletAddress || "",
      profilePicture,
    });
    
    if (walletAddress) {
      console.log("User created with wallet address:", walletAddress);
      localStorage.setItem('wallet_connected', 'true');
    }
    
    console.log("User created successfully in Firebase:", user.uid, "with role:", normalizedRole);
    
    // Store normalized role in localStorage for immediate availability across components
    localStorage.setItem('user_role', normalizedRole);
    console.log("⭐ IMPORTANT: Saved user role to localStorage during signup:", normalizedRole);
    
    // Make sure to check the role is saved correctly
    const storedRole = localStorage.getItem('user_role');
    if (storedRole !== normalizedRole) {
      console.error("Role mismatch in localStorage. Expected:", normalizedRole, "Got:", storedRole);
      // Try setting it again
      localStorage.setItem('user_role', normalizedRole);
    }
    
    // Force a refresh of the auth token to ensure updated claims
    await user.getIdToken(true);
    
    return userCredential;
  } catch (error) {
    console.error("Error in signup process:", error);
    throw error;
  }
};

// Sign in with email/password
export const signInWithEmail = async (
  email: string, 
  password: string
): Promise<UserCredential> => {
  try {
    console.log(`Signing in user with email ${email}`);
    
    // Sign in with Firebase using email
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    
    console.log("User authenticated successfully with Firebase:", user.uid);
    
    // Check if user exists in Firebase Realtime Database
    const userData = await getUserByUid(user.uid);
    
    if (!userData) {
      console.log("User exists in Firebase Auth but not in Realtime DB, creating record...");
      
      // Generate a username from the email or display name
      const username = user.displayName || email.split('@')[0];
      
      // Generate a default profile picture if needed
      const profilePicture = user.photoURL || createDefaultAvatar(username);
      
      // Create user in Realtime Database if it doesn't exist
      // Default role for new users
      const defaultRole = "investor";
      
      await updateUser(user.uid, {
        username,
        email,
        role: defaultRole,
        walletAddress: "",
        profilePicture,
      });
      
      // Store default role in localStorage
      localStorage.setItem('user_role', defaultRole);
      console.log("Created new user record with default role in localStorage:", defaultRole);
      
      // Update the user's profile in Firebase Auth if needed
      if (!user.displayName || !user.photoURL) {
        await updateProfile(user, {
          displayName: username,
          photoURL: profilePicture
        });
      }
    } else {
      // Store existing user's role in localStorage
      if (userData.role) {
        localStorage.setItem('user_role', userData.role);
        console.log("Saved existing user role to localStorage during sign-in:", userData.role);
      }
      
      // Update user's last login time
      await updateUser(user.uid, {
        lastActive: new Date().toISOString()
      });
    }
    
    // Force refresh the token to ensure we have updated claims
    await user.getIdToken(true);
    
    return credential;
  } catch (error) {
    console.error("Error in signin process:", error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    console.log("Starting Google sign-in process");
    
    const provider = new GoogleAuthProvider();
    
    // Add scopes for additional profile info
    provider.addScope('profile');
    provider.addScope('email');
    
    // Set custom parameters for better UX
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Sign in with popup
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log("Google sign-in successful for:", user.email);
    
    if (user.email) {
      // Check if user exists in Firebase Realtime Database
      const dbUser = await getUserByUid(user.uid);
      
      if (!dbUser) {
        console.log("Creating new Firebase user for Google sign-in");
        
        // Generate a username from the display name or email
        const username = user.displayName || user.email.split('@')[0];
        
        // Use Google photo URL or generate default avatar
        const profilePicture = user.photoURL || createDefaultAvatar(username);
        
        // Create a new user in Firebase Realtime Database
        await updateUser(user.uid, {
          username,
          email: user.email,
          role: "investor", // Default role for Google sign-ins
          walletAddress: "",
          profilePicture,
        });
        
        // Store default role in localStorage
        localStorage.setItem('user_role', "investor");
        console.log("Created new Firebase user from Google sign-in:", user.uid, "with default role: investor");
      } else {
        console.log("Found existing Firebase user:", user.uid);
        
        // Store existing user's role in localStorage
        if (dbUser.role) {
          localStorage.setItem('user_role', dbUser.role);
          console.log("Saved existing user role to localStorage during Google sign-in:", dbUser.role);
        }
        
        // Update the last active time in the database
        await updateUser(user.uid, { 
          lastActive: new Date().toISOString()
        });
      }
    }
    
    // Force refresh the token to ensure we have updated claims
    await user.getIdToken(true);
    
    return result;
  } catch (error) {
    console.error("Error in Google sign-in process:", error);
    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    console.log("Attempting to sign out user");
    
    // Update online status to false before signing out
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log("Updating online status for user:", currentUser.uid);
      
      // Update Realtime Database status
      await updateUser(currentUser.uid, { 
        lastActive: new Date().toISOString()
      });
    }
    
    // Clear localStorage values related to authentication
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('user_role');
    console.log("Cleared wallet_connected and user_role from localStorage during sign-out");
    
    // Sign out from Firebase
    console.log("Signing out from Firebase");
    return firebaseSignOut(auth);
  } catch (error) {
    console.error("Error during sign out:", error);
    // Clear localStorage values before attempting sign-out again
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('user_role');
    console.log("Cleared localStorage during sign-out error recovery");
    
    // Still try to sign out even if the status update failed
    return firebaseSignOut(auth);
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
