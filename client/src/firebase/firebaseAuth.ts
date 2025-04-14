import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth } from "./config";
import { updateProfile } from "firebase/auth";

// Sign up with email/password
export const signup = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Signed up:", userCredential.user);
    return userCredential.user;
  } catch (error: any) {
    console.error("Signup error:", error.message);
    throw error;
  }
};

// Update user profile after signup
export const updateUserProfile = async (displayName: string, photoURL?: string) => {
  if (!auth.currentUser) return;
  
  try {
    await updateProfile(auth.currentUser, {
      displayName,
      photoURL: photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&size=256`
    });
    console.log("Profile updated successfully");
  } catch (error: any) {
    console.error("Profile update error:", error.message);
    throw error;
  }
};

// Login with email/password
export const login = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Logged in:", userCredential.user);
    return userCredential.user;
  } catch (error: any) {
    console.error("Login error:", error.message);
    throw error;
  }
};

// Login with Google
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    console.log("Google login successful:", result.user);
    return result.user;
  } catch (error: any) {
    console.error("Google login error:", error.message);
    throw error;
  }
};

// Logout
export const logout = async () => {
  try {
    await firebaseSignOut(auth);
    console.log("User logged out");
  } catch (error: any) {
    console.error("Logout error:", error.message);
    throw error;
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Observe auth state
export const observeAuthState = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User is logged in:", user.email);
    } else {
      console.log("No user logged in");
    }
    callback(user);
  });
};