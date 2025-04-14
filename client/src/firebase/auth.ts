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
    
    // After successful Firebase auth creation, create user in Firestore
    await createFirestoreUser(userCredential.user.uid, {
      username,
      email,
      role,
      walletAddress: null,
      createdAt: new Date(),
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
      // Create user in Firestore if it doesn't exist (might happen if data gets out of sync)
      await createFirestoreUser(credential.user.uid, {
        username: credential.user.displayName || email.split('@')[0],
        email,
        role: "investor", // Default role
        walletAddress: null,
        createdAt: new Date(),
      });
    }
    
    return credential;
  } catch (error) {
    console.error("Error in signin process:", error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserCredential> => {
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
  
  // Try to create or update user in our backend if needed
  try {
    const user = result.user;
    if (user.email) {
      await apiRequest("POST", "/api/auth/google", {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL
      });
    }
  } catch (error) {
    console.error("Error saving Google user to backend:", error);
    // Continue anyway as the Firebase auth was successful
  }
  
  return result;
};

// Sign out
export const signOut = async (): Promise<void> => {
  return firebaseSignOut(auth);
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: FirebaseUser | null) => void): () => void => {
  return onAuthStateChanged(auth, callback);
};
