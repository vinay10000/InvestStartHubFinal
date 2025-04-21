/**
 * MongoDB database operations for client-side
 * 
 * This file provides a MongoDB-compatible API for database operations
 * to replace Firebase Realtime Database functions
 */

// Interface for MongoDB user data
export interface MongoUser {
  id: number;
  username: string;
  email: string;
  role: string;
  walletAddress: string | null;
  profilePicture: string | null;
  createdAt: Date | null;
}

// Interface for MongoDB startup data
export interface MongoStartup {
  id: number;
  name: string;
  description: string;
  category: string | null;
  investmentStage: string;
  founderId: string;
  logoUrl: string | null;
  upiQrCode: string | null;
  upiId: string | null;
  pitch: string;
  fundingGoal: string | null;
  currentFunding: string | null;
  websiteUrl: string | null;
  mediaUrls: string[];
  videoUrl: string | null;
  createdAt: Date | null;
}

// Interface for MongoDB document data
export interface MongoDocument {
  id: number;
  startupId: string;
  name: string;
  type: string;
  fileUrl: string;
  fileId: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: Date | null;
}

// MongoDB API methods

// Users

/**
 * Get a user by ID from MongoDB
 */
export async function getUser(userId: string | number): Promise<MongoUser | null> {
  try {
    const response = await fetch(`/api/user/profile?userId=${userId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching user: ${response.statusText}`);
    }
    
    const userData = await response.json();
    return userData.user || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Get a user by MongoDB UID (replaces Firebase uid function)
 * This function is an alias for getUser for compatibility with existing code
 */
export async function getUserByUid(uid: string): Promise<MongoUser | null> {
  console.log('Getting user by MongoDB uid:', uid);
  return getUser(uid);
}

/**
 * Update a user in MongoDB
 */
export async function updateUser(userId: string | number, userData: Partial<MongoUser>): Promise<MongoUser | null> {
  try {
    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        ...userData
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error updating user: ${response.statusText}`);
    }
    
    const updatedUser = await response.json();
    return updatedUser.user || null;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

// Startups

/**
 * Create a startup in MongoDB
 */
export async function createStartup(startupData: Omit<MongoStartup, 'id' | 'createdAt'>): Promise<MongoStartup> {
  try {
    const response = await fetch('/api/startups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(startupData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error creating startup: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.startup || !result.startup.id) {
      throw new Error('Failed to create startup - no valid startup data returned from server');
    }
    
    return result.startup;
  } catch (error) {
    console.error('Error creating startup:', error);
    throw error; // Re-throw to allow component to handle the error
  }
}

/**
 * Update a startup in MongoDB
 */
export async function updateStartup(startupId: string | number, startupData: Partial<MongoStartup>): Promise<MongoStartup> {
  try {
    const response = await fetch(`/api/startups/${startupId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(startupData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error updating startup: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.startup || !result.startup.id) {
      throw new Error('Failed to update startup - no valid startup data returned from server');
    }
    
    return result.startup;
  } catch (error) {
    console.error('Error updating startup:', error);
    throw error; // Re-throw to allow component to handle the error
  }
}

/**
 * Get startups by founder ID from MongoDB
 */
export async function getStartupsByFounderId(founderId: string | number): Promise<MongoStartup[]> {
  try {
    const response = await fetch(`/api/startups/founder/${founderId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching startups: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.startups || [];
  } catch (error) {
    console.error('Error fetching startups by founder ID:', error);
    return [];
  }
}

/**
 * Get a startup by ID from MongoDB
 */
export async function getStartup(startupId: string | number): Promise<MongoStartup | null> {
  try {
    const response = await fetch(`/api/startups/${startupId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching startup: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.startup || null;
  } catch (error) {
    console.error('Error fetching startup:', error);
    return null;
  }
}

// Documents

/**
 * Create a document in MongoDB
 */
export async function createDocument(documentData: Omit<MongoDocument, 'id' | 'createdAt'>): Promise<MongoDocument> {
  try {
    const response = await fetch(`/api/startups/${documentData.startupId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(documentData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error creating document: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.document || !result.document.id) {
      throw new Error('Failed to create document - no valid document data returned from server');
    }
    
    return result.document;
  } catch (error) {
    console.error('Error creating document:', error);
    throw error; // Re-throw to allow component to handle the error
  }
}

/**
 * Get documents by startup ID from MongoDB
 */
export async function getDocumentsByStartupId(startupId: string | number): Promise<MongoDocument[]> {
  try {
    const response = await fetch(`/api/startups/${startupId}/documents`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching documents: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.documents || [];
  } catch (error) {
    console.error('Error fetching documents by startup ID:', error);
    return [];
  }
}