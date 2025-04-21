/**
 * Database connections for both Firebase and PostgreSQL
 * This file exports both Firebase and PostgreSQL database connections for compatibility
 */
import { firebaseApp, firestore, realtimeDb } from './firebase.db';

// Re-export Firebase connections to maintain compatibility with existing code
export { firestore, realtimeDb };