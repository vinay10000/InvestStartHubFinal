import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "./config";
import { apiRequest } from "@/lib/queryClient";
import { createFirestoreUser, getFirestoreUser, updateFirestoreUser } from "./firestore";

// Sign up with email/password
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  username: string, 
  role: "founder" | "investor"
): Promise<UserCredential> => {
  try {
    // Create firebase auth user first
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Generate a default profile picture with initials
    const initials = username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    
    // Create a default avatar URL from UI Avatars
    const profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=256`;
    
    // After successful Firebase auth creation, create user in Firestore and Realtime DB
    await createFirestoreUser(userCredential.user.uid, {
      username,
      email,
      role,
      walletAddress: "",
      profilePicture,
    });
    
    console.log("User created successfully in Firebase:", userCredential.user.uid);
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
    // Sign in with Firebase using email
    const credential = await signInWithEmailAndPassword(auth, email, password);
    console.log("User authenticated successfully with Firebase:", credential.user.uid);
    
    // Check if user exists in Firestore
    const userData = await getFirestoreUser(credential.user.uid);
    if (!userData) {
      console.log("User exists in Firebase Auth but not in Firestore, creating record...");
      
      // Generate a username from the email
      const username = credential.user.displayName || email.split('@')[0];
      
      // Generate a default profile picture
      const initials = username
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
      
      const profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=256`;
      
      // Create user in Firestore if it doesn't exist (might happen if data gets out of sync)
      await createFirestoreUser(credential.user.uid, {
        username,
        email,
        role: "investor", // Default role
        walletAddress: "",
        profilePicture,
      });
      
      // Update the user's display name in Firebase Auth if not set
      if (!credential.user.displayName) {
        await updateFirestoreUser(credential.user.uid, { username });
      }
    }
    
    return credential;
  } catch (error) {
    console.error("Error in signin process:", error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    const provider = new GoogleAuthProvider();
    
    // Add scopes for additional profile info
    provider.addScope('profile');
    provider.addScope('email');
    
    // Set custom parameters for better UX
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Sign in with popup to ensure we can see users in Firebase console
    const result = await signInWithPopup(auth, provider);
    
    // Handle Firestore integration directly
    const user = result.user;
    if (user.email) {
      // Check if user exists in Firestore
      const firestoreUser = await getFirestoreUser(user.uid);
      
      if (!firestoreUser) {
        // Generate a username from the email or display name
        const username = user.displayName || user.email.split('@')[0];
        
        // Use Google photo URL or generate default avatar
        let profilePicture = user.photoURL;
        
        // If no photo URL is available, create a default avatar
        if (!profilePicture) {
          const initials = username
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();
          
          profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=256`;
        }
        
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
    
    return result;
  } catch (error) {
    console.error("Error in Google sign-in process:", error);
    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    // Update online status to false before signing out
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Update Realtime Database status
      await updateFirestoreUser(currentUser.uid, { 
        online: false,
        lastActive: new Date()
      });
    }
    
    // Sign out from Firebase
    return firebaseSignOut(auth);
  } catch (error) {
    console.error("Error during sign out:", error);
    // Still try to sign out even if the status update failed
    return firebaseSignOut(auth);
  }
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: FirebaseUser | null) => void): () => void => {
  return onAuthStateChanged(auth, callback);
};
