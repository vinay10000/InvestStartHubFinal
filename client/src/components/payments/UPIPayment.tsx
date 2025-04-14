import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, QrCode, ExternalLink } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { Startup } from "@shared/schema";

const paymentSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number",
  }),
  transactionId: z.string().min(1, "Transaction ID is required"),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface UPIPaymentProps {
  startup: Startup;
  investorId: number;
  onSuccess: () => void;
}

const UPIPayment = ({ startup, investorId, onSuccess }: UPIPaymentProps) => {
  const { createTransaction } = useTransactions();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"details" | "verification">("details");
  
  const createTransactionMutation = createTransaction();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      transactionId: "",
    },
  });

  const handleSubmit = async (data: PaymentFormValues) => {
    if (step === "details") {
      setStep("verification");
      return;
    }
    
    try {
      // Create transaction record
      await createTransactionMutation.mutateAsync({
        startupId: startup.id,
        investorId: investorId,
        amount: data.amount,
        paymentMethod: "upi",
        transactionId: data.transactionId,
        status: "pending", // Requires verification from founder
      });
      
      onSuccess();
    } catch (error: any) {
      setError(error.message || "Failed to record your payment. Please try again.");
    }
  };

  const noUpiDetails = !startup.upiId && !startup.upiQrCode;
  const isLoading = createTransactionMutation.isPending;

  return (
    <div className="space-y-6 py-4">
      {noUpiDetails && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>UPI Details Missing</AlertTitle>
          <AlertDescription>
            This startup has not provided UPI payment details yet. Please contact the founder for alternative payment methods.
          </AlertDescription>
        </Alert>
      )}
      
      {!noUpiDetails && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {step === "details" && (
              <>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Amount (USD)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter amount in USD" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {startup.upiId && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium mb-1">UPI ID</p>
                    <p className="text-base font-mono">{startup.upiId}</p>
                  </div>
                )}
                
                {startup.upiQrCode && (
                  <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center">
                    <p className="text-sm font-medium mb-2">Scan QR Code</p>
                    <div className="bg-white p-2 rounded-lg border mb-2">
                      <img 
                        src={startup.upiQrCode} 
                        alt="UPI QR Code" 
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <a 
                      href={startup.upiQrCode} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center"
                    >
                      Open in new tab
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                )}
                
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
                  <p>
                    <strong>Instructions:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>Open your UPI app (Google Pay, PhonePe, etc.)</li>
                    <li>Enter the UPI ID or scan the QR code</li>
                    <li>Enter the amount and complete the transaction</li>
                    <li>Note down the transaction ID (UTR/Reference Number)</li>
                    <li>Click "Next" to verify the transaction</li>
                  </ol>
                </div>
              </>
            )}
            
            {step === "verification" && (
              <>
                <Alert variant="info">
                  <QrCode className="h-4 w-4" />
                  <AlertTitle>Payment Verification</AlertTitle>
                  <AlertDescription>
                    Enter the Transaction ID/UTR Number from your payment app to verify your payment.
                  </AlertDescription>
                </Alert>
                
                <FormField
                  control={form.control}
                  name="transactionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction ID/UTR Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter the transaction reference ID" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Found in your payment app confirmation screen or message
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-between">
              {step === "verification" && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep("details")} 
                  disabled={isLoading}
                >
                  Back
                </Button>
              )}
              
              <Button 
                type="submit" 
                className={step === "details" ? "ml-auto" : ""}
                disabled={isLoading || noUpiDetails}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : step === "details" ? (
                  "Next"
                ) : (
                  "Verify Payment"
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default UPIPayment;
