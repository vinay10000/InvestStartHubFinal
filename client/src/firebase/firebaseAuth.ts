// MongoDB-compatible mock for Firebase Authentication
// Import auth from our config mock
import { auth } from "./config";

// Mock user type for compatibility with Firebase
export interface MockFirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

// Sign up with email/password - using MongoDB API endpoint
export const signup = async (email: string, password: string) => {
  try {
    console.log("Firebase disabled: Using MongoDB registration");
    
    // Make a direct API call to MongoDB registration endpoint
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: email.split('@')[0], // Use part before @ as username
        email,
        password,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Registration failed');
    }
    
    // Get user data from response
    const userData = await response.json();
    
    // Transform to match Firebase user structure
    const mockUser = transformMongoUserToFirebaseUser(userData);
    console.log("Signed up with MongoDB:", mockUser);
    
    return mockUser;
  } catch (error: any) {
    console.error("Signup error:", error.message);
    throw error;
  }
};

// Update user profile after signup - using MongoDB API
export const updateUserProfile = async (displayName: string, photoURL?: string) => {
  try {
    console.log("Firebase disabled: Using MongoDB profile update");
    
    // Generate avatar URL if not provided
    const finalPhotoURL = photoURL || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&size=256`;
    
    // Make API call to update profile
    const response = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName,
        photoURL: finalPhotoURL
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Profile update failed');
    }
    
    console.log("Profile updated successfully with MongoDB");
  } catch (error: any) {
    console.error("Profile update error:", error.message);
    throw error;
  }
};

// Login with email/password - using MongoDB API endpoint
export const login = async (email: string, password: string) => {
  try {
    console.log("Firebase disabled: Using MongoDB login");
    
    // Make a direct API call to MongoDB login endpoint
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: email, // The API will handle if this is email or username
        password,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Login failed');
    }
    
    // Get user data from response
    const userData = await response.json();
    
    // Transform to match Firebase user structure
    const mockUser = transformMongoUserToFirebaseUser(userData);
    console.log("Logged in with MongoDB:", mockUser);
    
    return mockUser;
  } catch (error: any) {
    console.error("Login error:", error.message);
    throw error;
  }
};

// Login with Google - No direct MongoDB support, show warning
export const loginWithGoogle = async () => {
  try {
    console.log("Firebase disabled: Google login not supported with MongoDB");
    throw new Error("Google login is not available after migration to MongoDB. Please use standard login.");
  } catch (error: any) {
    console.error("Google login error:", error.message);
    throw error;
  }
};

// Logout - using MongoDB API endpoint
export const logout = async () => {
  try {
    console.log("Firebase disabled: Using MongoDB logout");
    
    // Make API call to logout endpoint
    const response = await fetch('/api/logout', {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Logout failed');
    }
    
    console.log("User logged out with MongoDB");
  } catch (error: any) {
    console.error("Logout error:", error.message);
    throw error;
  }
};

// Get current user - using MongoDB API
export const getCurrentUser = () => {
  // Return the mock from config since we can't directly check session state
  return auth.currentUser;
};

// Observe auth state - no direct MongoDB equivalent, use mock
export const observeAuthState = (callback: (user: any) => void) => {
  // Use the mock implementation from our config
  return auth.onAuthStateChanged(callback);
};

// Helper function to transform MongoDB user to Firebase user format
function transformMongoUserToFirebaseUser(mongoUser: any): MockFirebaseUser {
  // Create a Firebase-compatible user object
  return {
    uid: mongoUser.id?.toString() || mongoUser._id?.toString() || '',
    email: mongoUser.email || null,
    displayName: mongoUser.username || null,
    photoURL: mongoUser.profilePicture || null,
    emailVerified: true, // Assume verified since MongoDB doesn't track this
    isAnonymous: false,
    metadata: {
      creationTime: mongoUser.createdAt || new Date().toISOString(),
      lastSignInTime: new Date().toISOString()
    }
  };
}