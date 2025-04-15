import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as supabaseService from '../services/supabase';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useStartups() {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);

  // Get all startups
  const useAllStartups = () => {
    return useQuery({
      queryKey: ['startups'],
      queryFn: () => supabaseService.getStartups(),
    });
  };

  // Get startups by founder ID
  const useFounderStartups = (founderId?: string) => {
    const id = founderId || user?.id;
    
    return useQuery({
      queryKey: ['startups', 'founder', id],
      queryFn: () => id ? supabaseService.getStartupsByFounderId(id) : Promise.resolve([]),
      enabled: !!id,
    });
  };

  // Get startup by ID
  const useStartup = (id?: string) => {
    return useQuery({
      queryKey: ['startups', id],
      queryFn: () => id ? supabaseService.getStartupById(id) : Promise.resolve(null),
      enabled: !!id,
    });
  };

  // Create startup
  const useCreateStartup = () => {
    return useMutation({
      mutationFn: supabaseService.createStartup,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['startups'] });
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: ['startups', 'founder', user.id] });
        }
      },
    });
  };

  // Update startup
  const useUpdateStartup = () => {
    return useMutation({
      mutationFn: ({ id, updates }: { id: string; updates: any }) => 
        supabaseService.updateStartup(id, updates),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['startups'] });
        queryClient.invalidateQueries({ queryKey: ['startups', variables.id] });
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: ['startups', 'founder', user.id] });
        }
      },
    });
  };

  return {
    useAllStartups,
    useFounderStartups,
    useStartup,
    useCreateStartup,
    useUpdateStartup,
  };
}

export function useDocuments() {
  const queryClient = useQueryClient();

  // Get documents by startup ID
  const useStartupDocuments = (startupId?: string) => {
    return useQuery({
      queryKey: ['documents', 'startup', startupId],
      queryFn: () => startupId ? supabaseService.getDocumentsByStartupId(startupId) : Promise.resolve([]),
      enabled: !!startupId,
    });
  };

  // Create document
  const useCreateDocument = () => {
    return useMutation({
      mutationFn: supabaseService.createDocument,
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['documents', 'startup', variables.startup_id] });
      },
    });
  };

  return {
    useStartupDocuments,
    useCreateDocument,
  };
}

export function useTransactions() {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);

  // Get transactions by startup ID
  const useStartupTransactions = (startupId?: string) => {
    return useQuery({
      queryKey: ['transactions', 'startup', startupId],
      queryFn: () => startupId ? supabaseService.getTransactionsByStartupId(startupId) : Promise.resolve([]),
      enabled: !!startupId,
    });
  };

  // Get transactions by investor ID
  const useInvestorTransactions = (investorId?: string) => {
    const id = investorId || user?.id;
    
    return useQuery({
      queryKey: ['transactions', 'investor', id],
      queryFn: () => id ? supabaseService.getTransactionsByInvestorId(id) : Promise.resolve([]),
      enabled: !!id,
    });
  };

  // Create transaction
  const useCreateTransaction = () => {
    return useMutation({
      mutationFn: supabaseService.createTransaction,
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['transactions', 'startup', variables.startup_id] });
        queryClient.invalidateQueries({ queryKey: ['transactions', 'investor', variables.investor_id] });
      },
    });
  };

  return {
    useStartupTransactions,
    useInvestorTransactions,
    useCreateTransaction,
  };
}

export function useChats() {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);

  // Get chats by user ID and role
  const useUserChats = () => {
    return useQuery({
      queryKey: ['chats', 'user', user?.id],
      queryFn: () => user?.id && user?.role 
        ? supabaseService.getChatsByUserId(user.id, user.role as 'founder' | 'investor') 
        : Promise.resolve([]),
      enabled: !!user?.id && !!user?.role,
    });
  };

  // Get chat by ID
  const useChat = (chatId?: string) => {
    return useQuery({
      queryKey: ['chats', chatId],
      queryFn: () => chatId ? supabaseService.getChatById(chatId) : Promise.resolve(null),
      enabled: !!chatId,
    });
  };

  // Create chat
  const useCreateChat = () => {
    return useMutation({
      mutationFn: supabaseService.createChat,
      onSuccess: () => {
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: ['chats', 'user', user.id] });
        }
      },
    });
  };

  return {
    useUserChats,
    useChat,
    useCreateChat,
  };
}

export function useMessages() {
  const queryClient = useQueryClient();

  // Get messages by chat ID
  const useChatMessages = (chatId?: string) => {
    return useQuery({
      queryKey: ['messages', 'chat', chatId],
      queryFn: () => chatId ? supabaseService.getMessagesByChatId(chatId) : Promise.resolve([]),
      enabled: !!chatId,
    });
  };

  // Create message
  const useCreateMessage = () => {
    return useMutation({
      mutationFn: supabaseService.createMessage,
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['messages', 'chat', variables.chat_id] });
      },
    });
  };

  // Subscribe to messages (returns a function to unsubscribe)
  const useMessageSubscription = (chatId?: string, callback?: (message: any) => void) => {
    if (!chatId || !callback) return () => {};
    return supabaseService.subscribeToMessages(chatId, callback);
  };

  return {
    useChatMessages,
    useCreateMessage,
    useMessageSubscription,
  };
}