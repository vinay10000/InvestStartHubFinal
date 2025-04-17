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
    // Use either provided founderId, user.id, or user.uid (Firebase UID)
    const id = founderId || user?.id || user?.uid;
    
    return useQuery({
      queryKey: ['startups', 'founder', id],
      queryFn: async () => {
        console.log("[useFounderStartups] Fetching startups with ID:", id);
        
        if (!id) {
          console.warn("[useFounderStartups] No ID available to fetch startups");
          return { startups: [] };
        }
        
        // Try fetching by ID first
        let startups = await getStartupsByFounderId(id.toString());
        
        // If no results and we have both id and uid, try the other one
        if (startups.length === 0 && user?.id && user?.uid && id !== user.uid) {
          console.log("[useFounderStartups] No startups found for ID, trying UID:", user.uid);
          startups = await getStartupsByFounderId(user.uid.toString());
        }
        
        console.log("[useFounderStartups] Found startups:", startups.length);
        return { startups }; // Match expected API response structure
      },
      enabled: !!id,
      // Refetch on window focus to ensure we have latest data after login
      refetchOnWindowFocus: true,
    });
  };

  // Get startup by ID
  const useStartup = (id?: string) => {
    console.log("[useStartups] Calling useStartup hook with ID:", id);
    
    return useQuery({
      queryKey: ['startups', id],
      queryFn: async () => {
        if (!id) {
          console.log("[useStartups] No ID provided to getStartupById, returning null");
          return Promise.resolve(null);
        }
        
        console.log("[useStartups] Fetching startup with ID:", id);
        const result = await getStartupById(id);
        console.log("[useStartups] getStartupById result:", result);
        return result;
      },
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