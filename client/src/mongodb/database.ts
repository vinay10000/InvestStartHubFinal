/**
 * MongoDB-compatible Database Functions
 * 
 * This module provides a simplified API that mimics the Firebase Realtime Database API
 * but uses MongoDB in the background. This helps maintain compatibility
 * with existing code while transitioning away from Firebase.
 */

// User-related functions
export async function getUserByUid(uid: string): Promise<any | null> {
  try {
    const response = await fetch(`/api/users/${uid}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to get user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting user by UID:', error);
    return null;
  }
}

export async function updateUser(uid: string, userData: any): Promise<any> {
  try {
    const response = await fetch(`/api/users/${uid}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to update user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// Startup-related functions
export async function getStartupById(startupId: string): Promise<any | null> {
  try {
    const response = await fetch(`/api/startups/${startupId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to get startup');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting startup by ID:', error);
    return null;
  }
}

export async function getStartups(): Promise<any[]> {
  try {
    const response = await fetch('/api/startups', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get startups');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting startups:', error);
    return [];
  }
}

export async function updateStartup(startupId: string, startupData: any): Promise<any> {
  try {
    const response = await fetch(`/api/mongodb/startups/${startupId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(startupData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to update startup');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating startup:', error);
    throw error;
  }
}

// Transaction-related functions
export async function getTransactions(): Promise<any[]> {
  try {
    const response = await fetch('/api/mongodb/transactions', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get transactions');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

export async function addTransaction(transactionData: any): Promise<any> {
  try {
    const response = await fetch('/api/mongodb/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to add transaction');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
}

// Chat/Message-related functions
export async function getChats(userId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/mongodb/chats/user/${userId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get chats');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting chats:', error);
    return [];
  }
}

export async function getChatById(chatId: string): Promise<any | null> {
  try {
    const response = await fetch(`/api/mongodb/chats/${chatId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to get chat');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting chat by ID:', error);
    return null;
  }
}

export async function createChat(chatData: any): Promise<any> {
  try {
    const response = await fetch('/api/mongodb/chats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chatData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to create chat');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
}

export async function getMessagesByChatId(chatId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/mongodb/messages/chat/${chatId}`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get messages');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting messages by chat ID:', error);
    return [];
  }
}

export async function sendMessage(messageData: any): Promise<any> {
  try {
    const response = await fetch('/api/mongodb/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}