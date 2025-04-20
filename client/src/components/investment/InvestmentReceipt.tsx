import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Transaction, Startup } from '@shared/schema';
import { downloadInvestmentReceipt, transactionToReceiptData } from '@/utils/pdfGenerator';
import { toast } from '@/hooks/use-toast';

interface InvestmentReceiptProps {
  transaction: Transaction;
  startup: Startup;
  investorName: string;
  className?: string;
}

const InvestmentReceipt = ({ transaction, startup, investorName, className = '' }: InvestmentReceiptProps) => {
  const [generating, setGenerating] = useState(false);
  
  // Status indicator based on transaction status
  const statusIndicator = () => {
    switch (transaction.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Format date for display
  const formatDate = (timestamp: number | Date | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Handle download receipt
  const handleDownloadReceipt = () => {
    try {
      setGenerating(true);
      
      // Convert transaction data to receipt format
      const receiptData = transactionToReceiptData(
        transaction,
        startup.name,
        investorName
      );
      
      // Download the PDF
      downloadInvestmentReceipt(receiptData);
      
      toast({
        title: "Receipt downloaded",
        description: "Your investment receipt has been downloaded successfully."
      });
    } catch (error) {
      console.error("Error generating receipt:", error);
      toast({
        title: "Error generating receipt",
        description: "Failed to generate the investment receipt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };
  
  return (
    <Card className={`${className} shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Investment Receipt</CardTitle>
            <CardDescription>Transaction #{transaction.id}</CardDescription>
          </div>
          <div className="flex items-center">
            {statusIndicator()}
            <span className="ml-2 text-sm capitalize">
              {transaction.status}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Startup</div>
            <div className="font-medium">{startup.name}</div>
            
            <div className="text-gray-500">Amount</div>
            <div className="font-medium">
              INR {parseFloat(transaction.amount).toLocaleString()}
            </div>
            
            <div className="text-gray-500">Payment Method</div>
            <div className="font-medium capitalize">{transaction.paymentMethod || 'UPI'}</div>
            
            <div className="text-gray-500">Date</div>
            <div className="font-medium">
              {transaction.createdAt ? formatDate(transaction.createdAt) : 'N/A'}
            </div>
            
            {transaction.paymentMethod === 'metamask' && transaction.transactionId && (
              <>
                <div className="text-gray-500">Wallet Transaction</div>
                <div className="font-medium text-xs truncate">{transaction.transactionId}</div>
              </>
            )}
            
            {transaction.paymentMethod === 'upi' && transaction.transactionId && (
              <>
                <div className="text-gray-500">UPI Reference</div>
                <div className="font-medium">{transaction.transactionId}</div>
              </>
            )}
          </div>
          
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={handleDownloadReceipt}
            disabled={generating || transaction.status !== 'completed'}
          >
            {generating ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-gray-500 rounded-full"></div>
                Generating...
              </div>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </>
            )}
          </Button>
          
          {transaction.status !== 'completed' && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Receipt is only available for completed transactions.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestmentReceipt;