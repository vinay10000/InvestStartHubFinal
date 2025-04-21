import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Chat, InsertChat, Message, InsertMessage } from "@shared/schema";
import { useState, useEffect, useCallback } from "react";

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
        // Create the chat using MongoDB API
        const response = await apiRequest("POST", "/api/chats", chatData);
        
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
        
        // Send message using MongoDB API
        const response = await apiRequest("POST", "/api/chats/" + chatId + "/messages", messageData);
        
        return response;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
      },
    });
  };

  // Polling-based messages hook to replace Firebase real-time functionality
  const useRealtimeMessages = (chatId: number) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch messages from MongoDB
    const fetchMessages = useCallback(async () => {
      if (!chatId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/chats/${chatId}/messages`);
        if (!response.ok) throw new Error('Failed to fetch messages');
        
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    }, [chatId]);

    // Initial fetch and polling setup
    useEffect(() => {
      if (!chatId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Fetch immediately
      fetchMessages();
      
      // Set up polling every 3 seconds
      const intervalId = setInterval(fetchMessages, 3000);
      
      return () => {
        clearInterval(intervalId);
      };
    }, [chatId, fetchMessages]);

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
