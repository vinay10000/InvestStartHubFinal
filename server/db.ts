import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import * as schema from "@shared/schema";
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
// Note: In production, use environment variables for configuration
let firebaseApp;

try {
  // If running in production with service account credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT
    ) as ServiceAccount;
    
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.projectId}-default-rtdb.firebaseio.com`,
    });
  } else {
    // For development without explicit credentials (relies on Google Application Default Credentials)
    firebaseApp = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID || 'demo-project'}-default-rtdb.firebaseio.com`,
    });
  }
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

// Export Firestore and Realtime Database instances
export const firestore = firebaseApp ? getFirestore(firebaseApp) : null;
export const realtimeDb = firebaseApp ? getDatabase(firebaseApp) : null;

// Keep the db export for compatibility with existing code
export const db = { firestore, realtimeDb };
