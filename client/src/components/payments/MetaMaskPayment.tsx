import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wallet, AlertTriangle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/useWeb3";
import { useContractInteraction } from "@/hooks/useContractInteraction";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => !isNaN(parseFloat(val)), "Amount must be a number")
    .refine(val => parseFloat(val) > 0, "Amount must be greater than 0")
});

interface MetaMaskPaymentProps {
  startupId: number;
  startupName: string;
  onPaymentComplete?: (txHash: string, amount: string) => void;
}

const MetaMaskPayment = ({ 
  startupId, 
  startupName,
  onPaymentComplete 
}: MetaMaskPaymentProps) => {
  const { isInstalled, address, connect } = useWeb3();
  const { investInStartup } = useContractInteraction();
  const { createTransaction } = useTransactions();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: ""
    }
  });
  
  // Handle investment
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!address) {
      try {
        const connected = await connect();
        if (!connected) {
          toast({
            title: "Wallet Connection Required",
            description: "Please connect your MetaMask wallet to proceed with the investment",
            variant: "destructive"
          });
          return;
        }
      } catch (error: any) {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect to MetaMask",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsProcessing(true);
    
    try {
      // Invest using the contract
      const result = await investInStartup(startupId, values.amount);
      
      if (result) {
        // Store transaction hash
        setTxHash(result.transactionHash);
        
        // Record transaction in our backend
        if (user) {
          await createTransaction.mutateAsync({
            startupId,
            investorId: user.id,
            amount: values.amount, // Use string directly as our schema expects
            paymentMethod: "metamask",
            transactionId: result.transactionHash,
            status: "pending" // Will be verified by admin
          });
        }
        
        // Notify user
        toast({
          title: "Investment Successful",
          description: `You have successfully invested ${values.amount} ETH in ${startupName}`,
        });
        
        // Call the callback if provided
        if (onPaymentComplete) {
          onPaymentComplete(result.transactionHash, values.amount);
        }
      }
    } catch (error: any) {
      console.error("Investment error:", error);
      
      toast({
        title: "Investment Failed",
        description: error.message || "Failed to process your investment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Render MetaMask not installed warning
  if (!isInstalled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Pay with MetaMask
          </CardTitle>
          <CardDescription>
            Use cryptocurrency to invest in this startup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-amber-50 text-amber-800 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">MetaMask Not Detected</h4>
              <p className="text-sm">
                To invest using cryptocurrency, please install the MetaMask extension for your browser.
              </p>
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm flex items-center gap-1 mt-2 text-blue-600 hover:underline"
              >
                <span>Get MetaMask</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render transaction success view
  if (txHash) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Investment Successful
          </CardTitle>
          <CardDescription>
            Your transaction has been submitted to the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-green-50 text-green-800">
            <p className="text-sm font-medium mb-1">Transaction Hash:</p>
            <p className="text-xs font-mono break-all">{txHash}</p>
            <p className="text-sm mt-2">
              Your investment will be confirmed once the transaction is verified on the blockchain.
              This usually takes a few minutes.
            </p>
          </div>
          
          <div className="text-center">
            <a 
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <span>View Transaction on Etherscan</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setTxHash(null)}
          >
            Make Another Investment
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Render payment form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Pay with MetaMask
        </CardTitle>
        <CardDescription>
          Use Ethereum to invest in {startupName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (ETH)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormDescription className="flex justify-between">
                    <span>Enter the amount you want to invest</span>
                    {address && (
                      <span className="text-xs text-muted-foreground">
                        Connected: {truncateAddress(address)}
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : address ? (
                "Complete Investment"
              ) : (
                "Connect Wallet & Invest"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default MetaMaskPayment;