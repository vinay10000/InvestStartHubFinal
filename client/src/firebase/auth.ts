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
    
    // After successful Firebase auth creation, create user in our backend
    await apiRequest("POST", "/api/auth/signup", {
      uid: userCredential.user.uid,
      username,
      email,
      password, // In a real app, we'd use a hashed password
      role
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
  username: string, 
  password: string
): Promise<any> => {
  try {
    // Get user from our backend to get the email
    const response = await apiRequest("POST", "/api/auth/login", {
      username,
      password
    });
    
    const userData = await response.json();
    
    if (!userData || !userData.user || !userData.user.email) {
      throw new Error("Invalid user data returned from server");
    }
    
    // Sign in with Firebase using email from our backend
    const credential = await signInWithEmailAndPassword(auth, userData.user.email, password);
    console.log("User authenticated successfully with Firebase:", credential.user.uid);
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
