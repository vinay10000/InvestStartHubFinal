/**
 * Firebase database initialization
 * This file initializes Firebase Admin SDK for server-side access to Firestore and Realtime Database
 */
import admin from 'firebase-admin';
import { log } from './vite';

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;
let firestore: admin.firestore.Firestore | null = null;
let realtimeDb: admin.database.Database | null = null;

try {
  // Initialize Firebase Admin SDK with default credentials
  firebaseApp = admin.initializeApp({
    databaseURL: 'https://ggfinal-3eda9-default-rtdb.asia-southeast1.firebasedatabase.app'
  });

  // Initialize Firestore and Realtime Database
  firestore = admin.firestore();
  realtimeDb = admin.database();
  
  log('Firebase Admin SDK initialized successfully');
} catch (error) {
  log('Error initializing Firebase Admin SDK:', error instanceof Error ? error.message : String(error));
}

export { firebaseApp, firestore, realtimeDb };