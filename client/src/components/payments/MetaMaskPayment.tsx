import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useWeb3 } from "@/hooks/useWeb3";
import { useTransactions } from "@/hooks/useTransactions";
import { Startup } from "@shared/schema";

const paymentSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface MetaMaskPaymentProps {
  startup: Startup;
  investorId: number;
  onSuccess: () => void;
}

const MetaMaskPayment = ({ startup, investorId, onSuccess }: MetaMaskPaymentProps) => {
  const { isInstalled, address, connect, send, isConnecting, isSending } = useWeb3();
  const { createTransaction } = useTransactions();
  const [error, setError] = useState<string | null>(null);
  
  const createTransactionMutation = createTransaction();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
    },
  });

  const handleSubmit = async (data: PaymentFormValues) => {
    if (!isInstalled) {
      setError("MetaMask is not installed. Please install MetaMask to continue.");
      return;
    }
    
    if (!address) {
      await connect();
      return;
    }
    
    try {
      // Process payment using MetaMask
      const txHash = await send(
        address, // Use any address from the user's wallet for demo purposes
        data.amount,
        `Investment in ${startup.name}`
      );
      
      if (!txHash) {
        setError("Transaction failed or was cancelled.");
        return;
      }
      
      // Create transaction record
      await createTransactionMutation.mutateAsync({
        startupId: startup.id,
        investorId: investorId,
        amount: data.amount,
        paymentMethod: "metamask",
        transactionId: txHash,
        status: "completed", // In a real app, you'd verify this on-chain
      });
      
      onSuccess();
    } catch (error: any) {
      setError(error.message || "Failed to process your payment. Please try again.");
    }
  };

  const isLoading = isConnecting || isSending || createTransactionMutation.isPending;

  return (
    <div className="space-y-6 py-4">
      {!isInstalled && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>MetaMask Required</AlertTitle>
          <AlertDescription>
            Please install the MetaMask browser extension to continue with the payment.
            <a
              href="https://metamask.io/download.html"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-primary hover:underline"
            >
              Install MetaMask
            </a>
          </AlertDescription>
        </Alert>
      )}
      
      {!address && isInstalled && (
        <Button 
          onClick={() => connect()} 
          className="w-full" 
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>Connect MetaMask</>
          )}
        </Button>
      )}
      
      {address && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium">Connected Wallet</p>
              <p className="text-xs text-gray-600 truncate">{address}</p>
            </div>
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investment Amount (ETH)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter amount in ETH" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    This amount will be sent from your MetaMask wallet
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Confirm Payment</>
              )}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
};

export default MetaMaskPayment;
