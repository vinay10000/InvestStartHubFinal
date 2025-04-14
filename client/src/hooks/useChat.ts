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
        const response = await apiRequest("POST", "/api/chats", chatData);
        return response.json();
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
        
        const response = await apiRequest(
          "POST", 
          `/api/chats/${chatId}/messages`, 
          messageData
        );
        
        // Also send to Firebase Realtime Database for real-time updates
        await sendRealtimeMessage(chatId.toString(), {
          senderId,
          content,
          chatId: chatId.toString(),
        });
        
        return response.json();
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
