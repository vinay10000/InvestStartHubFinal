/**
 * MongoDB Database Placeholders
 * 
 * This file provides placeholder exports for what was previously Firebase functionality.
 * Now the system exclusively uses MongoDB for all database operations.
 */
import { log } from './vite';

// Define null values to avoid reference errors when imported
const firebaseApp = null;
const firestore = null;
const realtimeDb = null;

log('Using MongoDB exclusively - Firebase has been removed');

export { firebaseApp, firestore, realtimeDb };