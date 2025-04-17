import { ref, push, get, onValue, set, remove } from "firebase/database";
import { database } from "./config";
import { Chat, Message } from "@shared/schema";

// Chat CRUD operations
// Use a more flexible type for Firebase which accepts any properties
export const createRealtimeChat = async (chatData: Record<string, any>): Promise<string> => {
  const chatRef = ref(database, "chats");
  const newChatRef = push(chatRef);
  
  await set(newChatRef, {
    ...chatData,
    createdAt: new Date().toISOString(),
  });
  
  return newChatRef.key as string;
};

export const getRealtimeChat = async (chatId: string): Promise<any> => {
  const chatRef = ref(database, `chats/${chatId}`);
  const snapshot = await get(chatRef);
  
  if (snapshot.exists()) {
    return { id: snapshot.key, ...snapshot.val() };
  }
  
  return null;
};

export const getChatsByUserId = async (userId: number, role: "founder" | "investor"): Promise<any[]> => {
  const idField = role === "founder" ? "founderId" : "investorId";
  const chatsRef = ref(database, "chats");
  const snapshot = await get(chatsRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  const chats: any[] = [];
  snapshot.forEach((childSnapshot) => {
    const chat = childSnapshot.val();
    if (chat[idField] === userId) {
      chats.push({ id: childSnapshot.key, ...chat });
    }
  });
  
  return chats;
};

// Message CRUD operations
export const sendRealtimeMessage = async (
  chatId: string, 
  messageData: Record<string, any> // Use a more flexible type for Firebase
): Promise<string> => {
  // Make sure we have a valid chat reference before sending messages
  // First check if the chat exists
  const chatRef = ref(database, `chats/${chatId}`);
  const chatSnapshot = await get(chatRef);
  
  // If chat doesn't exist, create it with basic data
  if (!chatSnapshot.exists()) {
    console.log(`Chat ${chatId} doesn't exist in Firebase. Creating it now.`);
    
    // Extract sender information to determine roles
    const senderId = messageData.senderId || "unknown";
    
    // Try to get user info to determine if sender is founder or investor
    const userRole = localStorage.getItem('user_role') || 'unknown';
    
    // Set default chat structure based on sender role
    await set(chatRef, {
      founderId: userRole === 'founder' ? senderId : "unknown",
      investorId: userRole === 'investor' ? senderId : "unknown",
      startupId: "1", // Default startup ID
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
      lastMessage: "",
      founderUnread: 0,
      investorUnread: 0
    });
    
    console.log(`Created new chat in Firebase with ID ${chatId}`);
  }
  
  // Now we can add the message
  const messagesRef = ref(database, `chats/${chatId}/messages`);
  const newMessageRef = push(messagesRef);
  
  await set(newMessageRef, {
    ...messageData,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(), // Add timestamp for easier sorting
    read: false,           // Initialize as unread
    delivered: true        // Assume delivered
  });
  
  // Update the last message and other metadata in the chat
  const chatData = chatSnapshot.exists() ? chatSnapshot.val() : {};
  
  // Determine which unread counter to increment
  const userRole = localStorage.getItem('user_role') || 'unknown';
  let founderUnread = chatData.founderUnread || 0;
  let investorUnread = chatData.investorUnread || 0;
  
  // Increment the appropriate unread counter based on who sent the message
  if (userRole === 'founder') {
    investorUnread += 1; // Founder sent message, increment investor's unread count
  } else if (userRole === 'investor') {
    founderUnread += 1;  // Investor sent message, increment founder's unread count
  }
  
  // Update chat metadata
  await set(chatRef, {
    ...chatData,
    lastMessage: messageData.content ? messageData.content.substring(0, 50) + (messageData.content.length > 50 ? '...' : '') : "",
    timestamp: Date.now(),
    founderUnread,
    investorUnread
  });
  
  return newMessageRef.key as string;
};

export const getRealtimeMessages = async (chatId: string): Promise<any[]> => {
  // Check both possible message locations for backward compatibility
  // First try the new location (chat/id/messages)
  const chatMessagesRef = ref(database, `chats/${chatId}/messages`);
  const chatSnapshot = await get(chatMessagesRef);
  
  if (chatSnapshot.exists()) {
    const messages: any[] = [];
    chatSnapshot.forEach((childSnapshot) => {
      messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    
    return messages.sort((a, b) => {
      // Use timestamp if available, fall back to createdAt
      const timeA = a.timestamp || new Date(a.createdAt).getTime();
      const timeB = b.timestamp || new Date(b.createdAt).getTime();
      return timeA - timeB;
    });
  }
  
  // If not found, try the old location
  const messagesRef = ref(database, `messages/${chatId}`);
  const snapshot = await get(messagesRef);
  
  if (!snapshot.exists()) {
    // Neither location has messages
    return [];
  }
  
  const messages: any[] = [];
  snapshot.forEach((childSnapshot) => {
    messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
  });
  
  return messages.sort((a, b) => {
    // Use timestamp if available, fall back to createdAt
    const timeA = a.timestamp || new Date(a.createdAt).getTime();
    const timeB = b.timestamp || new Date(b.createdAt).getTime();
    return timeA - timeB;
  });
};

// Subscribe to real-time updates
export const subscribeToMessages = (chatId: string, callback: (messages: any[]) => void): () => void => {
  // Create handler function for processing snapshots
  const handleSnapshot = (snapshot: any) => {
    if (!snapshot.exists()) {
      // If the first location had no messages, we'll check the second one
      return;
    }
    
    const messages: any[] = [];
    snapshot.forEach((childSnapshot: any) => {
      messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    
    // Sort messages by timestamp
    messages.sort((a, b) => {
      // Use timestamp if available, fall back to createdAt
      const timeA = a.timestamp || new Date(a.createdAt).getTime();
      const timeB = b.timestamp || new Date(b.createdAt).getTime();
      return timeA - timeB;
    });
    
    callback(messages);
  };
  
  // First try the new location in chats
  const chatMessagesRef = ref(database, `chats/${chatId}/messages`);
  
  // This onValue will listen for changes in the new location
  const chatUnsubscribe = onValue(chatMessagesRef, (snapshot) => {
    if (snapshot.exists()) {
      handleSnapshot(snapshot);
    } else {
      // If no messages in new location, fallback to old location
      const messagesRef = ref(database, `messages/${chatId}`);
      
      // Check old location once
      get(messagesRef).then(oldSnapshot => {
        if (oldSnapshot.exists()) {
          // Process the old messages
          handleSnapshot(oldSnapshot);
        } else {
          // No messages in either location
          callback([]);
        }
      });
    }
  });
  
  // Return a function to unsubscribe
  return () => {
    // Remove the listener
    chatUnsubscribe();
  };
};

export const deleteRealtimeChat = async (chatId: string): Promise<void> => {
  // Delete the chat
  const chatRef = ref(database, `chats/${chatId}`);
  await remove(chatRef);
  
  // Delete all messages in the chat
  const messagesRef = ref(database, `messages/${chatId}`);
  await remove(messagesRef);
};
