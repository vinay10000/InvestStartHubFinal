import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

// Log environment variables for debugging (without showing actual values)
console.log("Firebase environment variables available:", {
  apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: !!import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: !!import.meta.env.VITE_FIREBASE_DATABASE_URL,
});

// Check if we have the necessary Firebase config
const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY && 
                         import.meta.env.VITE_FIREBASE_PROJECT_ID;

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  // Use custom auth domain if provided, otherwise construct default one
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  // Use custom storage bucket if provided, otherwise construct default one
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
  // Realtime Database URL
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.firebaseio.com`,
};

// Initialize with proper types
let app: ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth>;
let firestore: ReturnType<typeof getFirestore>;
let storage: ReturnType<typeof getStorage>;
let database: ReturnType<typeof getDatabase>;

// Initialize Firebase only if we have proper configuration
try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);

  // Initialize Firebase services
  auth = getAuth(app);
  firestore = getFirestore(app);
  storage = getStorage(app);
  database = getDatabase(app);

  // Set persistence to LOCAL to keep the user logged in even after page refresh
  if (hasFirebaseConfig) {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("Firebase Auth persistence set to LOCAL");
      })
      .catch((error) => {
        console.error("Error setting persistence:", error);
      });
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
  console.warn("Using fallback authentication and storage mechanisms");
  
  // Create a fallback implementation for Firebase services
  // This will allow the app to work without Firebase when Firebase config is missing
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback: (user: null) => void) => {
      callback(null);
      return () => {};
    },
    signInWithEmailAndPassword: async () => {
      throw new Error("Firebase not configured properly. Please add Firebase keys to environment variables.");
    },
    createUserWithEmailAndPassword: async () => {
      throw new Error("Firebase not configured properly. Please add Firebase keys to environment variables.");
    },
    signOut: async () => {}
  };
  
  firestore = {};
  storage = {};
  database = {};
}

// Export Firebase services
export { auth, firestore, storage, database };

// Export initialized app
export default app;
