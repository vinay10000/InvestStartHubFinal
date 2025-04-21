/**
 * Firebase Mock Module
 * 
 * This file provides mock objects to satisfy Firebase imports throughout the codebase
 * without actually initializing Firebase, since we're migrating to MongoDB.
 */

// Import the same robust mock from config to ensure consistency
import { app as configApp, auth as configAuth, database as configDatabase } from './config';

// Use the same mock objects as in config.ts to ensure consistency
export const app = configApp;
export const auth = configAuth;
export const database = configDatabase;

// Add any Firebase SDK functions that might be directly imported
export const getAuth = () => auth;

// Create more complete Firestore mock with _instanceStarted property
export const getFirestore = () => ({
  _instanceStarted: true,
  collection: () => ({}),
  doc: () => ({}),
  batch: () => ({}),
  runTransaction: async () => ({}),
  app: app,
  _delegate: { app }
});

// Create more complete Storage mock with _instanceStarted property
export const getStorage = () => ({
  _instanceStarted: true,
  ref: () => ({}),
  app: app,
  _delegate: { app }
});

// Make sure database has _instanceStarted property
export const getDatabase = () => {
  // Add the _instanceStarted property to the database mock
  database._instanceStarted = true;
  return database;
};

// Add mock Firebase SDK constructors/initializers
export function initializeApp() { return app; }
export function onAuthStateChanged(callback: (user: null) => void) {
  setTimeout(() => callback(null), 0);
  return () => {};
}

console.log("Firebase is disabled - using MongoDB authentication instead");

export default app;