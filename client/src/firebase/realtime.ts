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
  messageData: Omit<Message, "id" | "chatId" | "createdAt"> & { chatId: string }
): Promise<string> => {
  const messagesRef = ref(database, `messages/${chatId}`);
  const newMessageRef = push(messagesRef);
  
  await set(newMessageRef, {
    ...messageData,
    createdAt: new Date().toISOString(),
  });
  
  return newMessageRef.key as string;
};

export const getRealtimeMessages = async (chatId: string): Promise<any[]> => {
  const messagesRef = ref(database, `messages/${chatId}`);
  const snapshot = await get(messagesRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  const messages: any[] = [];
  snapshot.forEach((childSnapshot) => {
    messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
  });
  
  return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

// Subscribe to real-time updates
export const subscribeToMessages = (chatId: string, callback: (messages: any[]) => void): () => void => {
  const messagesRef = ref(database, `messages/${chatId}`);
  
  // Create a function that transforms the snapshot into an array of messages
  const handleSnapshot = (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const messages: any[] = [];
    snapshot.forEach((childSnapshot: any) => {
      messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    
    // Sort messages by timestamp
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    callback(messages);
  };
  
  // Set up the listener
  onValue(messagesRef, handleSnapshot);
  
  // Return a function to unsubscribe
  return () => {
    // Remove the listener
    onValue(messagesRef, () => {});
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
