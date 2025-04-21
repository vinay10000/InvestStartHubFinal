/**
 * MongoDB-compatible Auth API forwarding to firebaseAuth
 * 
 * This is a compatibility layer that forwards auth-related functions to our 
 * MongoDB-compatible implementation in firebaseAuth.ts
 */

import { 
  signup as mongoSignup,
  login as mongoLogin,
  loginWithGoogle as mongoLoginWithGoogle,
  logout as mongoLogout,
  observeAuthState as mongoObserveAuthState,
  updateUserProfile as mongoUpdateUserProfile,
  getIdToken as mongoGetIdToken,
  User
} from './firebaseAuth';

// Export the User type
export type { User };

// Firebase Auth API compatibility functions that use MongoDB in the background
export const signUpWithEmail = mongoSignup;
export const signInWithEmail = mongoLogin;
export const signInWithGoogle = mongoLoginWithGoogle;
export const signOut = mongoLogout;
export const onAuthChange = mongoObserveAuthState;
export const updateUserProfile = mongoUpdateUserProfile;
export const getIdToken = mongoGetIdToken;

// Export a default object for compatibility with Firebase auth
export default {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  onAuthChange,
  updateUserProfile,
  getIdToken
};