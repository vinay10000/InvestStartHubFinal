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
  // Create firebase auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Create user in our backend
  await apiRequest("POST", "/api/auth/signup", {
    username,
    email,
    password, // In a real app, we'd use a hashed password
    role
  });
  
  return userCredential;
};

// Sign in with email/password
export const signInWithEmail = async (
  username: string, 
  password: string
): Promise<any> => {
  // Get user from our backend to get the email
  const response = await apiRequest("POST", "/api/auth/login", {
    username,
    password
  });
  
  const userData = await response.json();
  
  // Sign in with Firebase
  return signInWithEmailAndPassword(auth, userData.user.email, password);
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

// Sign out
export const signOut = async (): Promise<void> => {
  return firebaseSignOut(auth);
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: FirebaseUser | null) => void): () => void => {
  return onAuthStateChanged(auth, callback);
};
