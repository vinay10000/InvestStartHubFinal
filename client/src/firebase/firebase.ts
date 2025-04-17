import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
};

// Check if Firebase environment variables are set
const areEnvVarsAvailable = () => {
  const firebaseVars = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
  };

  // Only log once in development
  if (import.meta.env.DEV) {
    console.log("Firebase environment variables available:", {
      apiKey: !!firebaseVars.apiKey,
      projectId: !!firebaseVars.projectId,
      messagingSenderId: !!firebaseVars.messagingSenderId,
      appId: !!firebaseVars.appId,
      databaseURL: !!firebaseVars.databaseURL
    });
  }
  
  return Object.values(firebaseVars).some(value => !!value);
};

// Initialize Firebase (prevent duplicate initialization)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const database = getDatabase(app);

// Log Firebase initialization
if (areEnvVarsAvailable() && import.meta.env.DEV) {
  console.log("Firebase initialized with project:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
} else if (import.meta.env.DEV) {
  console.warn("Firebase initialized without complete environment variables. Some features may not work correctly.");
}

export default app;