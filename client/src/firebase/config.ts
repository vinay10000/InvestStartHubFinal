import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD41dN3ZEiIFJ9Xhl-IGA1ps3GmFoOtQKM",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "ggfinal-3eda9"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ggfinal-3eda9",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "ggfinal-3eda9"}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:851976207769:web:47edff9badf275cf43a708",
  // Only include database URL if using Realtime Database
  databaseURL: `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID || "ggfinal-3eda9"}.firebaseio.com`,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export const database = getDatabase(app);

export default app;
