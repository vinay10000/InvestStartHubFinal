/**
 * MongoDB-compatible Authentication API
 * 
 * This module provides a simplified API that mimics the Firebase Authentication API
 * but uses MongoDB in the background. This helps maintain compatibility
 * with existing code while transitioning away from Firebase.
 */

import { apiRequest } from '@/lib/queryClient';

// Define user interface to match Firebase Auth User structure
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  customClaims?: {
    [key: string]: any;
  };
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  providerData?: any[];
  [key: string]: any;
}

let currentUser: User | null = null;
const authStateObservers: Array<(user: User | null) => void> = [];

// Check if user is already logged in on initialization
(async function initAuth() {
  try {
    console.log("Initializing auth state...");
    const response = await apiRequest('GET', '/api/user');
    
    // Handle unauthorized responses correctly
    if (response.status === 401) {
      console.log("No authenticated user found");
      currentUser = null;
      notifyAuthStateObservers();
      return;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get user data: ${response.status} ${response.statusText}`);
    }
    
    const userData = await response.json();
    
    if (userData) {
      console.log("User found:", userData.username || userData.email);
      // Convert MongoDB user to Firebase-like user
      currentUser = formatUserData(userData);
      notifyAuthStateObservers();
    } else {
      console.log("No user data returned");
      currentUser = null;
      notifyAuthStateObservers();
    }
  } catch (error) {
    console.error("Error initializing auth state:", error);
    // Ensure we still notify observers even on error
    currentUser = null;
    notifyAuthStateObservers();
  }
})();

// Helper to convert MongoDB user data to Firebase-like user
function formatUserData(userData: any): User {
  return {
    uid: userData.id?.toString() || userData._id?.toString(),
    email: userData.email || null,
    displayName: userData.username || null,
    photoURL: userData.profilePicture || null,
    emailVerified: true, // Assume verified for simplicity
    customClaims: {
      role: userData.role || 'investor'
    },
    metadata: {
      creationTime: userData.createdAt ? new Date(userData.createdAt).toISOString() : new Date().toISOString(),
      lastSignInTime: new Date().toISOString()
    },
    providerData: [{
      providerId: 'password',
      uid: userData.email
    }],
    // Include all original properties
    ...userData
  };
}

// Notify all observers of auth state changes
function notifyAuthStateObservers() {
  authStateObservers.forEach(observer => observer(currentUser));
}

// Create a new user with email and password
export async function signup(email: string, password: string): Promise<User | null> {
  try {
    const response = await apiRequest('POST', '/api/register', {
      email,
      password,
      username: email.split('@')[0], // Default username based on email
      role: 'investor' // Default role
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Registration failed with status: ${response.status}`);
    }

    const userData = await response.json();
    currentUser = formatUserData(userData);
    notifyAuthStateObservers();
    return currentUser;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
}

// Log in a user with email and password
export async function login(email: string, password: string): Promise<User | null> {
  try {
    console.log(`Attempting to log in with email: ${email}`);
    
    // Normalize email (remove whitespace and convert to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Determine if this is an email or username
    const isEmail = normalizedEmail.includes('@');
    const loginPayload = {
      // If it looks like an email, use it as email, otherwise as username
      ...(isEmail ? { email: normalizedEmail } : { username: normalizedEmail }),
      password
    };
    
    console.log(`Login payload prepared with ${isEmail ? 'email' : 'username'}`);
    
    const response = await apiRequest('POST', '/api/login', loginPayload);

    // Special handling for common error cases
    if (response.status === 401) {
      throw new Error("Invalid username/email or password");
    }
    
    if (response.status === 404) {
      throw new Error("User not found");
    }

    if (!response.ok) {
      let errorMessage = `Login failed with status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        // If we can't parse the error response, use the default message
      }
      throw new Error(errorMessage);
    }

    // Parse user data
    const userData = await response.json();
    
    if (!userData) {
      throw new Error("No user data returned from server");
    }
    
    console.log(`Login successful for user: ${userData.username || userData.email}`);
    
    currentUser = formatUserData(userData);
    notifyAuthStateObservers();
    return currentUser;
  } catch (error) {
    console.error("Login error:", error);
    // Clear current user on login error
    currentUser = null;
    notifyAuthStateObservers();
    throw error;
  }
}

// Log in with Google (mock)
export async function loginWithGoogle(): Promise<User | null> {
  try {
    // In a real implementation, redirect to Google OAuth
    // For now, just throw an error since we're migrating away from Firebase
    throw new Error("Google login is not supported in the MongoDB implementation. Please use email/password login.");
  } catch (error) {
    console.error("Google login error:", error);
    throw error;
  }
}

// Log out the current user
export async function logout(): Promise<void> {
  try {
    const response = await apiRequest('POST', '/api/logout');
    
    if (!response.ok) {
      throw new Error(`Logout failed with status: ${response.status}`);
    }
    
    currentUser = null;
    notifyAuthStateObservers();
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

// Update the user's profile
export async function updateUserProfile(displayName: string, photoURL?: string): Promise<void> {
  if (!currentUser) {
    throw new Error("No user is logged in");
  }

  try {
    const updateData: any = { username: displayName };
    if (photoURL) {
      updateData.profilePicture = photoURL;
    }

    const response = await apiRequest('PATCH', `/api/users/${currentUser.uid}`, updateData);
    
    if (!response.ok) {
      throw new Error(`Update profile failed with status: ${response.status}`);
    }
    
    const updatedUserData = await response.json();
    currentUser = {
      ...currentUser,
      displayName,
      ...(photoURL && { photoURL }),
      ...updatedUserData
    };
    
    notifyAuthStateObservers();
  } catch (error) {
    console.error("Update profile error:", error);
    throw error;
  }
}

// Observe auth state changes
export function observeAuthState(observer: (user: User | null) => void): () => void {
  authStateObservers.push(observer);
  
  // Immediately notify the observer of the current state
  observer(currentUser);
  
  // Return unsubscribe function
  return () => {
    const index = authStateObservers.indexOf(observer);
    if (index !== -1) {
      authStateObservers.splice(index, 1);
    }
  };
}

// Get the current authenticated user
export function getCurrentUser(): User | null {
  return currentUser;
}

// Get ID token for the current user (mock)
export async function getIdToken(): Promise<string | null> {
  if (!currentUser) {
    return null;
  }
  
  // In a real implementation, this would get a JWT from the server
  // For now, return a placeholder token
  return `mongodb-auth-token-${currentUser.uid}`;
}

export default {
  signup,
  login,
  loginWithGoogle,
  logout,
  updateUserProfile,
  observeAuthState,
  getCurrentUser,
  getIdToken
};