import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/MongoAuthContext';

export function useStartups() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get all startups
  const useAllStartups = () => {
    return useQuery({
      queryKey: ['startups'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/startups');
        return await response.json();
      },
      // Add these options to improve caching behavior
      staleTime: 0, // Consider data stale immediately
      gcTime: 5 * 60 * 1000, // Cache for 5 minutes (formerly cacheTime)
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when window regains focus
    });
  };

  // Get startups by founder ID
  const useFounderStartups = (founderId?: string) => {
    // Use either provided founderId or user.id
    const id = founderId || user?.id;
    
    return useQuery({
      queryKey: ['startups', 'founder', id],
      queryFn: async () => {
        console.log("[useFounderStartups] Fetching startups with ID:", id);
        
        if (!id) {
          console.warn("[useFounderStartups] No ID available to fetch startups");
          return { startups: [] };
        }
        
        // Fetch using MongoDB API
        const response = await apiRequest('GET', `/api/startups?founderId=${id}`);
        const result = await response.json();
        
        console.log("[useFounderStartups] Found startups:", result.startups?.length || 0);
        return result;
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
          console.log("[useStartups] No ID provided for startup, returning null");
          return Promise.resolve(null);
        }
        
        console.log("[useStartups] Fetching startup with ID:", id);
        const response = await apiRequest('GET', `/api/startups/${id}`);
        const result = await response.json();
        console.log("[useStartups] getStartupById result:", result);
        return result;
      },
      enabled: !!id,
    });
  };

  // Create startup
  const useCreateStartup = () => {
    return useMutation({
      mutationFn: async (startupData: any) => {
        const response = await apiRequest('POST', '/api/startups', startupData);
        return response.json();
      },
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
      mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
        const response = await apiRequest('PUT', `/api/startups/${id}`, updates);
        return response.json();
      },
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
      queryFn: async () => {
        if (!startupId) return Promise.resolve([]);
        
        const response = await apiRequest('GET', `/api/startups/${startupId}/documents`);
        return response.json();
      },
      enabled: !!startupId,
    });
  };

  // Create document
  const useCreateDocument = () => {
    return useMutation({
      mutationFn: async (documentData: any) => {
        const response = await apiRequest('POST', `/api/startups/${documentData.startupId}/documents`, documentData);
        return response.json();
      },
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
  const { user } = useAuth();

  // Get transactions by startup ID
  const useStartupTransactions = (startupId?: string) => {
    return useQuery({
      queryKey: ['transactions', 'startup', startupId],
      queryFn: async () => {
        if (!startupId) return { transactions: [] };
        
        const response = await apiRequest('GET', `/api/investments?startupId=${startupId}`);
        return response.json();
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
        if (!id) return { transactions: [] };
        
        const response = await apiRequest('GET', `/api/investments?investorId=${id}`);
        return response.json();
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
        if (!id) return { transactions: [] };
        
        // Using the mongoose API to fetch founder's transactions
        const response = await apiRequest('GET', `/api/investments?founderId=${id}`);
        return response.json();
      },
      enabled: !!id,
    });
  };

  // Create transaction
  const useCreateTransaction = () => {
    return useMutation({
      mutationFn: async (transactionData: any) => {
        const response = await apiRequest('POST', '/api/investments', transactionData);
        return response.json();
      },
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