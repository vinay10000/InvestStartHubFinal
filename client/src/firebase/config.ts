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
  // Realtime Database URL - use default format if not explicitly provided
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 
               `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}-default-rtdb.firebaseio.com`,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const database = getDatabase(app);

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

// Export Firebase services 
export { auth, firestore, storage, database, app };
