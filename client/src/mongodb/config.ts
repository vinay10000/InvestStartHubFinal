/**
 * MongoDB configuration
 * 
 * This module provides a centralized configuration for MongoDB-related functionality
 * on the client side, similar to how the Firebase config was structured.
 */

// Create a simple auth object for compatibility with former Firebase code
// This mimics the Firebase auth structure but uses our MongoDB authentication
export interface MongoAuth {
  currentUser: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null;
}

// Initialize auth object
export const auth: MongoAuth = {
  currentUser: null,
};

// Function to update the current user
export function setCurrentUser(user: MongoAuth['currentUser']): void {
  auth.currentUser = user;
}

// Function to clear the current user
export function clearCurrentUser(): void {
  auth.currentUser = null;
}