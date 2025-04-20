import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Transaction, Startup, User } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import InvestmentReceipt from '@/components/investment/InvestmentReceipt';
import { toast } from '@/hooks/use-toast';

const TransactionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [startup, setStartup] = useState<Startup | null>(null);
  const [investor, setInvestor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch transaction details
  useEffect(() => {
    const fetchTransactionDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch transaction data
        const transactionRes = await fetch(`/api/investments/${id}`);
        if (!transactionRes.ok) {
          throw new Error('Failed to fetch transaction details');
        }
        
        const transactionData = await transactionRes.json();
        setTransaction(transactionData);
        
        // Fetch startup data
        const startupRes = await fetch(`/api/startups/${transactionData.startupId}`);
        if (!startupRes.ok) {
          throw new Error('Failed to fetch startup details');
        }
        
        const startupData = await startupRes.json();
        setStartup(startupData);
        
        // Fetch investor data (if needed)
        if (user?.role === 'founder') {
          const investorRes = await fetch(`/api/user/profile?id=${transactionData.investorId}`);
          if (investorRes.ok) {
            const investorData = await investorRes.json();
            setInvestor(investorData);
          }
        }
      } catch (error) {
        console.error('Error fetching transaction details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load transaction details. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactionDetails();
  }, [id, user]);
  
  // Get status badge
  const getStatusBadge = () => {
    if (!transaction) return null;
    
    switch (transaction.status) {
      case 'completed':
        return (
          <div className="flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm">
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </div>
        );
      default:
        return (
          <div className="flex items-center px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Failed
          </div>
        );
    }
  };
  
  // Format date
  const formatDate = (date: Date | number | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Button>
        </div>
        
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-t-2 border-b-2 border-primary rounded-full"></div>
        </div>
      </div>
    );
  }
  
  if (!transaction || !startup) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-2">Transaction Not Found</h3>
              <p className="text-gray-500">The transaction you're looking for doesn't exist or you don't have permission to view it.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Transactions
        </Button>
        {getStatusBadge()}
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Detailed information about this investment</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-y-3">
                <div className="text-sm text-gray-500">Transaction ID</div>
                <div className="text-sm font-medium">{transaction.id}</div>
                
                <div className="text-sm text-gray-500">Status</div>
                <div className="text-sm font-medium capitalize">{transaction.status}</div>
                
                <div className="text-sm text-gray-500">Amount</div>
                <div className="text-sm font-medium">
                  INR {parseFloat(transaction.amount).toLocaleString()}
                </div>
                
                <div className="text-sm text-gray-500">Date</div>
                <div className="text-sm font-medium">
                  {transaction.createdAt ? formatDate(transaction.createdAt) : 'N/A'}
                </div>
                
                <div className="text-sm text-gray-500">Payment Method</div>
                <div className="text-sm font-medium capitalize">{transaction.paymentMethod || 'UPI'}</div>
                
                {transaction.paymentMethod === 'metamask' && transaction.transactionId && (
                  <>
                    <div className="text-sm text-gray-500">Wallet Transaction</div>
                    <div className="text-sm font-medium break-all">{transaction.transactionId}</div>
                  </>
                )}
                
                {transaction.paymentMethod === 'upi' && transaction.transactionId && (
                  <>
                    <div className="text-sm text-gray-500">UPI Reference</div>
                    <div className="text-sm font-medium">{transaction.transactionId}</div>
                  </>
                )}
                
                <div className="text-sm text-gray-500">Startup</div>
                <div className="text-sm font-medium">{startup.name}</div>
                
                {investor && (
                  <>
                    <div className="text-sm text-gray-500">Investor</div>
                    <div className="text-sm font-medium">{investor.username}</div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <InvestmentReceipt 
          transaction={transaction}
          startup={startup}
          investorName={investor?.username || user?.username || "Investor"}
        />
      </div>
    </div>
  );
};

export default TransactionDetails;