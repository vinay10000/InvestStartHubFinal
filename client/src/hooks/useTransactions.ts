import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Transaction, InsertTransaction } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const useTransactions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all transactions
  const getAllTransactions = () => {
    return useQuery<{ transactions: Transaction[] }>({
      queryKey: ["/api/investments"],
      refetchOnWindowFocus: false,
    });
  };

  // Get transactions by investor ID
  const getTransactionsByInvestorId = (investorId?: number | string) => {
    if (!investorId) return { data: { transactions: [] }, isLoading: false };
    
    // All transactions now use MongoDB via the API
    return useQuery<{ transactions: Transaction[] }>({
      queryKey: ["/api/investments", { investorId }],
      enabled: !!investorId,
      refetchOnWindowFocus: true,
      refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    });
  };

  // Get transactions by founder ID
  const getTransactionsByFounderId = (founderId?: number | string) => {
    if (!founderId) return { data: { transactions: [] }, isLoading: false };
    
    // All transactions now use MongoDB via the API
    return useQuery<{ transactions: Transaction[] }>({
      queryKey: ["/api/investments", { founderId }],
      enabled: !!founderId,
      refetchOnWindowFocus: true,
      refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    });
  };

  // Get transactions by startup ID
  const getTransactionsByStartupId = (startupId?: number) => {
    if (!startupId) return { data: { transactions: [] }, isLoading: false };
    
    return useQuery<{ transactions: Transaction[] }>({
      queryKey: ["/api/investments", { startupId }],
      enabled: !!startupId,
      refetchOnWindowFocus: false,
    });
  };

  // Create a new transaction
  const createTransaction = useMutation({
    mutationFn: async (transactionData: InsertTransaction) => {
      return apiRequest("POST", "/api/investments", transactionData);
    },
    onSuccess: () => {
      // Invalidate all transaction queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      
      toast({
        title: "Transaction created",
        description: "Your investment has been recorded successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error creating transaction:", error);
      toast({
        title: "Transaction failed",
        description: error.message || "Failed to record your investment",
        variant: "destructive",
      });
    },
  });

  // Verify a transaction
  const verifyTransaction = useMutation({
    mutationFn: async ({ transactionId, status }: { transactionId: string; status: string }) => {
      return apiRequest("POST", "/api/investments/verify", { transactionId, status });
    },
    onSuccess: () => {
      // Invalidate all transaction queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      
      toast({
        title: "Transaction verified",
        description: "The investment transaction has been verified",
      });
    },
    onError: (error: any) => {
      console.error("Error verifying transaction:", error);
      toast({
        title: "Verification failed",
        description: error.message || "Failed to verify the transaction",
        variant: "destructive",
      });
    },
  });

  // Function to manually refresh all transaction-related queries
  const refreshTransactions = () => {
    console.log("[Transactions] Manually refreshing all transaction queries");
    queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
    
    toast({
      title: "Refreshed",
      description: "Transaction data has been refreshed",
    });
    
    return true;
  };

  return {
    getAllTransactions,
    getTransactionsByInvestorId,
    getTransactionsByFounderId,
    getTransactionsByStartupId,
    createTransaction,
    verifyTransaction,
    refreshTransactions,
  };
};