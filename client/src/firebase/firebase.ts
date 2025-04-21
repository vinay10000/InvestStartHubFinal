/**
 * Firebase Mock Module
 * 
 * This file provides mock objects to satisfy Firebase imports throughout the codebase
 * without actually initializing Firebase, since we're migrating to MongoDB.
 */

// Import the same robust mock from config to ensure consistency
import { app as configApp, auth as configAuth, database as configDatabase } from './config';

// Add _instanceStarted property to the database object immediately to prevent null errors
if (!configDatabase._instanceStarted) {
  configDatabase._instanceStarted = true;
}

// Use the same mock objects as in config.ts to ensure consistency
export const app = configApp;
export const auth = configAuth;
export const database = configDatabase;

// Create more complete database mock that always has _instanceStarted property
export const getDatabase = () => {
  // Make sure database always has _instanceStarted property
  if (!database._instanceStarted) {
    database._instanceStarted = true;
  }
  return database;
};

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

// Define Firebase database methods that are imported directly by other modules
export const ref = (path = '') => database.ref(path);
export const set = async (ref: any, value: any) => ref.set(value);
export const get = async (ref: any) => ref.get();
export const update = async (ref: any, value: any) => ref.update(value);
export const remove = async (ref: any) => ref.remove();
export const push = (ref: any) => ref.push();
export const onValue = (ref: any, callback: any) => ref.onValue(callback);
export const query = (ref: any) => ref;
export const orderByChild = (path: string) => (ref: any) => ref.orderByChild(path);
export const equalTo = (value: any) => (query: any) => query.equalTo(value);
export const limitToFirst = (limit: number) => (query: any) => query.limit(limit);
export const limitToLast = (limit: number) => (query: any) => query.limit(limit);
export const startAt = (value: any) => (query: any) => query.startAt(value);
export const endAt = (value: any) => (query: any) => query.endAt(value);

// Add mock Firebase SDK constructors/initializers
export function initializeApp() { return app; }
export function onAuthStateChanged(callback: (user: null) => void) {
  setTimeout(() => callback(null), 0);
  return () => {};
}

console.log("Firebase is disabled - using MongoDB authentication instead");

export default app;