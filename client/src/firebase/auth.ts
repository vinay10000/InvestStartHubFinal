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
import { createFirestoreUser, getFirestoreUser, updateFirestoreUser } from "./firestore";

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
  role: "founder" | "investor"
): Promise<UserCredential> => {
  try {
    console.log(`Creating new user account for ${email} with role ${role}`);
    
    // Create firebase auth user first
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Generate a default profile picture
    const profilePicture = createDefaultAvatar(username);
    
    // Set display name and photoURL in Firebase Auth
    await updateProfile(user, {
      displayName: username,
      photoURL: profilePicture
    });
    
    console.log("Updated user profile in Firebase Auth with displayName and photoURL");
    
    // Create user in Firestore and Realtime DB
    await createFirestoreUser(user.uid, {
      username,
      email,
      role,
      walletAddress: "",
      profilePicture,
    });
    
    console.log("User created successfully in Firebase:", user.uid);
    
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
    
    // Check if user exists in Firestore
    const userData = await getFirestoreUser(user.uid);
    
    if (!userData) {
      console.log("User exists in Firebase Auth but not in Firestore, creating record...");
      
      // Generate a username from the email or display name
      const username = user.displayName || email.split('@')[0];
      
      // Generate a default profile picture if needed
      const profilePicture = user.photoURL || createDefaultAvatar(username);
      
      // Create user in Firestore if it doesn't exist
      await createFirestoreUser(user.uid, {
        username,
        email,
        role: "investor", // Default role
        walletAddress: "",
        profilePicture,
      });
      
      // Update the user's profile in Firebase Auth if needed
      if (!user.displayName || !user.photoURL) {
        await updateProfile(user, {
          displayName: username,
          photoURL: profilePicture
        });
      }
    } else {
      // Update user's last login time and online status
      await updateFirestoreUser(user.uid, {
        online: true,
        lastActive: new Date()
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
      // Check if user exists in Firestore
      const firestoreUser = await getFirestoreUser(user.uid);
      
      if (!firestoreUser) {
        console.log("Creating new Firestore user for Google sign-in");
        
        // Generate a username from the display name or email
        const username = user.displayName || user.email.split('@')[0];
        
        // Use Google photo URL or generate default avatar
        const profilePicture = user.photoURL || createDefaultAvatar(username);
        
        // Create a new user in Firestore
        await createFirestoreUser(user.uid, {
          username,
          email: user.email,
          role: "investor", // Default role for Google sign-ins
          walletAddress: "",
          profilePicture,
        });
        
        console.log("Created new Firestore user from Google sign-in:", user.uid);
      } else {
        console.log("Found existing Firestore user:", user.uid);
        
        // Update the online status in the database for real-time presence
        await updateFirestoreUser(user.uid, { 
          online: true,
          lastActive: new Date()
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
      await updateFirestoreUser(currentUser.uid, { 
        online: false,
        lastActive: new Date()
      });
    }
    
    // Sign out from Firebase
    console.log("Signing out from Firebase");
    return firebaseSignOut(auth);
  } catch (error) {
    console.error("Error during sign out:", error);
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
