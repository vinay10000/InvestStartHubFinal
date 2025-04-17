import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QrCode, CheckCircle2, Loader2, ClipboardCopy, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { useTransactions } from "@/hooks/useTransactions";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";

const formSchema = z.object({
  amount: z.string()
    .min(1, "Amount is required")
    .refine(val => !isNaN(parseFloat(val)), "Amount must be a number")
    .refine(val => parseFloat(val) > 0, "Amount must be greater than 0"),
  fullName: z.string()
    .min(1, "Full name is required")
    .min(3, "Full name must be at least 3 characters"),
  referenceId: z.string()
    .min(1, "Reference ID is required")
    .min(6, "Reference ID must be at least 6 characters")
});

interface UPIPaymentProps {
  startupId: number;
  startupName: string;
  upiId?: string;
  upiQrCode?: string | { url: string; fileId?: string; fileName?: string; fileSize?: number; mimeType?: string };
  onPaymentComplete?: (referenceId: string, amount: string) => void;
}

const UPIPayment = ({ 
  startupId, 
  startupName,
  upiId,
  upiQrCode,
  onPaymentComplete 
}: UPIPaymentProps) => {
  const { createTransaction } = useTransactions();
  const { user } = useSimpleAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      fullName: "",
      referenceId: ""
    }
  });
  
  // Handle payment submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to complete this transaction",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Record transaction in our backend with additional details
      await createTransaction.mutateAsync({
        startupId,
        investorId: user.id,
        amount: values.amount, // Use string directly as our schema expects
        paymentMethod: "upi",
        transactionId: values.referenceId,
        status: "pending", // Will be verified by admin
      });
      
      // Notify user
      toast({
        title: "Payment Recorded",
        description: `Your payment of ${formatCurrency(parseFloat(values.amount))} to ${startupName} has been recorded`,
      });
      
      // Set completed state
      setCompleted(true);
      
      // Call the callback if provided
      if (onPaymentComplete) {
        onPaymentComplete(values.referenceId, values.amount);
      }
    } catch (error: any) {
      console.error("Payment recording error:", error);
      
      toast({
        title: "Payment Recording Failed",
        description: error.message || "Failed to record your payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Copy text to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(label);
      toast({
        title: "Copied to clipboard",
        description: `${label} has been copied to your clipboard`,
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedText(null), 2000);
    });
  };
  
  // Render payment success view
  if (completed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            Payment Recorded
          </CardTitle>
          <CardDescription>
            Your payment information has been submitted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-green-50 text-green-800">
            <p className="text-sm">
              Your payment will be verified by the startup founder or admin.
              You will be notified once your payment is confirmed.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => {
              setCompleted(false);
              form.reset();
            }}
          >
            Make Another Payment
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // If no UPI details are provided
  if (!upiId && !upiQrCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pay with UPI
          </CardTitle>
          <CardDescription>
            Use UPI to invest in this startup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-amber-50 text-amber-800">
            <p className="text-sm">
              This startup has not provided UPI payment details yet.
              Please try another payment method or contact the startup founder.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render payment form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Pay with UPI
        </CardTitle>
        <CardDescription>
          Use UPI to invest in {startupName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* UPI QR Code */}
        {upiQrCode && (
          <div className="flex flex-col items-center justify-center">
            <div className="border p-2 rounded-lg mb-2">
              <img 
                src={typeof upiQrCode === 'string' ? upiQrCode : (upiQrCode.url || '')} 
                alt="UPI QR Code" 
                className="w-full max-w-[200px] h-auto"
                onError={(e) => {
                  console.error("Failed to load UPI QR code image");
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite error loop
                  target.src = "https://via.placeholder.com/200x200?text=QR+Code+Not+Available";
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Scan this QR code with any UPI app to pay
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              QR Code Ready
            </p>
          </div>
        )}
        
        {/* UPI ID */}
        {upiId && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">UPI ID</p>
              <p className="text-sm font-mono">{upiId}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => copyToClipboard(upiId, "UPI ID")}
              className="h-8 px-2"
            >
              {copiedText === "UPI ID" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              After payment
            </span>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid</FormLabel>
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
                  <FormDescription>
                    Enter the exact amount you transferred
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name (as it appears in your UPI app)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., John Smith"
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter your full name as registered in your UPI payment app
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="referenceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UPI Reference ID</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., UPI123456789"
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the reference ID from your UPI payment receipt
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
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default UPIPayment;