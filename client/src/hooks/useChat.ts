import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Chat, InsertChat, Message, InsertMessage } from "@shared/schema";
import { useState, useEffect, useCallback } from "react";
import { subscribeToMessages, sendRealtimeMessage } from "@/firebase/realtime";

export const useChat = () => {
  const queryClient = useQueryClient();

  // Get all chats for a user (filtered by role)
  const getChats = (userId: number, role: string) => {
    return useQuery({
      queryKey: [`/api/chats?userId=${userId}&role=${role}`],
      enabled: !!userId,
    });
  };

  // Get a specific chat by ID
  const getChat = (chatId: number) => {
    return useQuery({
      queryKey: [`/api/chats/${chatId}`],
      enabled: !!chatId,
    });
  };

  // Create a new chat
  const createChat = () => {
    return useMutation({
      mutationFn: async (chatData: InsertChat) => {
        // First create the chat in our local storage API
        const response = await apiRequest("/api/chats", {
          method: "POST",
          body: JSON.stringify(chatData),
        });

        // Then also create a corresponding entry in Firebase Realtime DB
        try {
          // Import needed for createRealtimeChat
          const { createRealtimeChat } = await import('@/firebase/realtime');
          
          // Create the chat in Firebase realtime database which accepts any data structure
          // This is separate from the Drizzle schema types
          const firebaseChatId = await createRealtimeChat({
            // We need to pass string values for Firebase
            // TypeScript is complaining because we're mixing types, but this is intended
            // as we're creating a separate entity in Firebase
            founderId: String(chatData.founderId),
            investorId: String(chatData.investorId), 
            startupId: String(chatData.startupId),
            // Additional metadata for the Firebase chat
            timestamp: Date.now(),
            lastMessage: "",
            founderUnread: 0,
            investorUnread: 0
          } as Record<string, any>);
          
          // Enhance the response with the Firebase chat ID if needed
          if (response && response.chat) {
            response.chat.firebaseId = firebaseChatId;
          }
        } catch (err) {
          console.error("Failed to create Firebase chat entry:", err);
          // We continue even if Firebase fails since we have our local storage
        }
        
        return response;
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: [`/api/chats?userId=${variables.founderId}&role=founder`] });
        queryClient.invalidateQueries({ queryKey: [`/api/chats?userId=${variables.investorId}&role=investor`] });
      },
    });
  };

  // Get messages for a chat
  const getMessages = (chatId: number) => {
    return useQuery({
      queryKey: [`/api/chats/${chatId}/messages`],
      enabled: !!chatId,
    });
  };

  // Send a message in a chat
  const sendMessage = () => {
    return useMutation({
      mutationFn: async ({ 
        chatId, 
        senderId, 
        content 
      }: { 
        chatId: number; 
        senderId: number; 
        content: string;
      }) => {
        const messageData: Omit<InsertMessage, "chatId"> & { chatId: number } = {
          chatId,
          senderId,
          content,
        };
        
        const response = await apiRequest(`/api/chats/${chatId}/messages`, {
          method: "POST",
          body: JSON.stringify(messageData),
        });
        
        // Also send to Firebase Realtime Database for real-time updates
        await sendRealtimeMessage(chatId.toString(), {
          senderId: String(senderId),  // Convert to string for Firebase
          content,
          chatId: chatId.toString(),
        } as Record<string, any>);
        
        return response;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${data.message.chatId}/messages`] });
      },
    });
  };

  // Custom hook for real-time messages
  const useRealtimeMessages = (chatId: number) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const handleNewMessages = useCallback((newMessages: any[]) => {
      setMessages(newMessages);
      setLoading(false);
    }, []);

    useEffect(() => {
      if (!chatId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Subscribe to real-time updates
      const unsubscribe = subscribeToMessages(chatId.toString(), handleNewMessages);
      
      return () => {
        unsubscribe();
      };
    }, [chatId, handleNewMessages]);

    return { messages, loading };
  };

  return {
    getChats,
    getChat,
    createChat,
    getMessages,
    sendMessage,
    useRealtimeMessages,
  };
};
