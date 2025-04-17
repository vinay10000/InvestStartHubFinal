import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getStartups, 
  getStartupsByFounderId, 
  getStartupById, 
  createStartup, 
  updateStartup, 
  getDocumentsByStartupId, 
  createDocument, 
  getTransactionsByStartupId, 
  getTransactionsByInvestorId, 
  createTransaction,
  getTransactionsByFounderId
} from '../firebase/database';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useStartups() {
  const queryClient = useQueryClient();
  const { user } = useContext(AuthContext);

  // Get all startups
  const useAllStartups = () => {
    return useQuery({
      queryKey: ['startups'],
      queryFn: async () => {
        const startups = await getStartups();
        return { startups }; // Match expected API response structure
      },
    });
  };

  // Get startups by founder ID
  const useFounderStartups = (founderId?: string) => {
    const id = founderId || user?.id;
    
    return useQuery({
      queryKey: ['startups', 'founder', id],
      queryFn: async () => {
        const startups = id ? await getStartupsByFounderId(id.toString()) : [];
        return { startups }; // Match expected API response structure
      },
      enabled: !!id,
    });
  };

  // Get startup by ID
  const useStartup = (id?: string) => {
    return useQuery({
      queryKey: ['startups', id],
      queryFn: () => id ? getStartupById(id) : Promise.resolve(null),
      enabled: !!id,
    });
  };

  // Create startup
  const useCreateStartup = () => {
    return useMutation({
      mutationFn: createStartup,
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
        updateStartup(id, updates),
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
      queryFn: () => startupId ? getDocumentsByStartupId(startupId) : Promise.resolve([]),
      enabled: !!startupId,
    });
  };

  // Create document
  const useCreateDocument = () => {
    return useMutation({
      mutationFn: createDocument,
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['documents', 'startup', variables.startupId] });
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
      queryFn: async () => {
        const transactions = startupId ? await getTransactionsByStartupId(startupId) : [];
        return { transactions }; // Match expected API response structure
      },
      enabled: !!startupId,
    });
  };

  // Get transactions by investor ID
  const useInvestorTransactions = (investorId?: string) => {
    const id = investorId || user?.id;
    
    return useQuery({
      queryKey: ['transactions', 'investor', id],
      queryFn: async () => {
        const transactions = id ? await getTransactionsByInvestorId(id.toString()) : [];
        return { transactions }; // Match expected API response structure
      },
      enabled: !!id,
    });
  };

  // Get transactions by founder ID
  const useFounderTransactions = (founderId?: string) => {
    const id = founderId || user?.id;
    
    return useQuery({
      queryKey: ['transactions', 'founder', id],
      queryFn: async () => {
        const transactions = id ? await getTransactionsByFounderId(id.toString()) : [];
        return { transactions }; // Match expected API response structure
      },
      enabled: !!id,
    });
  };

  // Create transaction
  const useCreateTransaction = () => {
    return useMutation({
      mutationFn: createTransaction,
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['transactions', 'startup', variables.startupId] });
        queryClient.invalidateQueries({ queryKey: ['transactions', 'investor', variables.investorId] });
      },
    });
  };

  return {
    useStartupTransactions,
    useInvestorTransactions,
    useFounderTransactions,
    useCreateTransaction,
  };
}