/**
 * MongoDB Auth API 
 * 
 * This module provides authentication functions that use the MongoDB API in the backend
 * instead of Firebase Authentication.
 */

// Types for MongoDB authentication
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

type AuthChangeCallback = (user: User | null) => void;

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string, 
  password: string, 
  username: string, 
  role: string,
  walletAddress?: string
): Promise<{ user: User; uid: string }> {
  try {
    // Create a new user through the API
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email, 
        password, 
        username, 
        role,
        walletAddress: walletAddress || null
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create account');
    }

    // Get the newly created user
    const user = await response.json();
    
    // Return in Firebase-compatible format
    return {
      user: {
        uid: user.id.toString(),
        email: user.email,
        displayName: user.username,
        photoURL: user.profilePicture
      },
      uid: user.id.toString()
    };
  } catch (error) {
    console.error('MongoDB signup error:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string, 
  password: string
): Promise<User> {
  try {
    // Login through the API
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: email, password }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Invalid login credentials');
    }

    // Get the authenticated user
    const user = await response.json();
    
    // Return in Firebase-compatible format
    return {
      uid: user.id.toString(),
      email: user.email,
      displayName: user.username,
      photoURL: user.profilePicture
    };
  } catch (error) {
    console.error('MongoDB login error:', error);
    throw error;
  }
}

/**
 * Sign in with Google (redirect to Google OAuth)
 * Note: This would require server-side implementation of Google OAuth
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    // In a real implementation, this would redirect to Google OAuth
    // For now, it calls the server-side Google auth endpoint
    const response = await fetch('/api/login/google', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Google sign-in failed');
    }

    // Get the authenticated user
    const user = await response.json();
    
    // Return in Firebase-compatible format
    return {
      uid: user.id.toString(),
      email: user.email,
      displayName: user.username,
      photoURL: user.profilePicture
    };
  } catch (error) {
    console.error('MongoDB Google login error:', error);
    throw error;
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  try {
    // Logout through the API
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Logout failed');
    }
    
    // No further action needed
  } catch (error) {
    console.error('MongoDB logout error:', error);
    throw error;
  }
}

/**
 * Observer for authentication state changes
 * 
 * This is a simplified implementation that checks auth status on initialization
 * and when called, but doesn't support real-time updates like Firebase.
 */
export function onAuthChange(callback: AuthChangeCallback): () => void {
  let isMounted = true;
  
  // Check auth state immediately
  fetch('/api/user', {
    method: 'GET',
    credentials: 'include'
  })
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      return null;
    })
    .then(user => {
      if (isMounted) {
        if (user) {
          // Format user in Firebase-compatible format
          callback({
            uid: user.id.toString(),
            email: user.email,
            displayName: user.username,
            photoURL: user.profilePicture
          });
        } else {
          callback(null);
        }
      }
    })
    .catch(error => {
      console.error('Error checking auth state:', error);
      if (isMounted) {
        callback(null);
      }
    });
  
  // Return unsubscribe function
  return () => {
    isMounted = false;
  };
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  updates: Partial<{
    displayName: string;
    photoURL: string;
    email: string;
    role: string;
    walletAddress: string;
  }>
): Promise<void> {
  try {
    // Get current user
    const userResponse = await fetch('/api/user', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!userResponse.ok) {
      throw new Error('User not authenticated');
    }
    
    const user = await userResponse.json();
    
    // Format updates for the server
    const serverUpdates = {
      username: updates.displayName,
      profilePicture: updates.photoURL,
      email: updates.email,
      role: updates.role,
      walletAddress: updates.walletAddress
    };
    
    // Only include properties that are being updated
    Object.keys(serverUpdates).forEach(key => {
      if (serverUpdates[key] === undefined) {
        delete serverUpdates[key];
      }
    });
    
    // Update profile through the API
    const response = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(serverUpdates),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }
  } catch (error) {
    console.error('MongoDB update profile error:', error);
    throw error;
  }
}

/**
 * Get ID token for current user
 * 
 * In MongoDB, we don't use tokens the same way, but we can create a 
 * compatible implementation that returns a session ID or similar.
 */
export async function getIdToken(): Promise<string> {
  try {
    // Get current auth session info
    const response = await fetch('/api/auth-token', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get auth token');
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('MongoDB get ID token error:', error);
    throw error;
  }
}