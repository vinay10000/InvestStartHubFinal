import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Transaction, InsertTransaction } from "@shared/schema";

export const useTransactions = () => {
  const queryClient = useQueryClient();

  // Get transactions by founder ID (for startup founders)
  const getTransactionsByFounderId = (founderId: number) => {
    return useQuery({
      queryKey: [`/api/investments?userId=${founderId}&role=founder`],
      enabled: !!founderId,
    });
  };

  // Get transactions by investor ID (for investors)
  const getTransactionsByInvestorId = (investorId: number) => {
    return useQuery({
      queryKey: [`/api/investments?userId=${investorId}&role=investor`],
      enabled: !!investorId,
    });
  };

  // Get transaction by ID
  const getTransactionById = (transactionId: number) => {
    return useQuery({
      queryKey: [`/api/investments/${transactionId}`],
      enabled: !!transactionId,
    });
  };

  // Create transaction
  const createTransaction = () => {
    return useMutation({
      mutationFn: async (transactionData: InsertTransaction) => {
        const response = await apiRequest("POST", "/api/investments", transactionData);
        return response.json();
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: [`/api/investments?userId=${variables.investorId}&role=investor`] });
        // Also invalidate founder's transactions
        queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      },
    });
  };

  // Verify transaction (update status)
  const verifyTransaction = () => {
    return useMutation({
      mutationFn: async ({ 
        transactionId, 
        status 
      }: { 
        transactionId: number; 
        status: string;
      }) => {
        const response = await apiRequest(
          "POST", 
          "/api/investments/verify", 
          { transactionId, status }
        );
        return response.json();
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [`/api/investments/${data.transaction.id}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      },
    });
  };

  return {
    getTransactionsByFounderId,
    getTransactionsByInvestorId,
    getTransactionById,
    createTransaction,
    verifyTransaction,
  };
};
