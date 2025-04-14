import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Search, Calendar, Tag } from "lucide-react";
import TransactionList from "@/components/transactions/TransactionList";
import { addDays } from "date-fns";

const Transactions = () => {
  const { user } = useAuth();
  const { getTransactionsByFounderId, getTransactionsByInvestorId } = useTransactions();
  
  const [filter, setFilter] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  });

  // Fetch transactions based on user role
  const { data: transactionsData, isLoading } = 
    user?.role === "founder" 
      ? getTransactionsByFounderId(user.id) 
      : getTransactionsByInvestorId(user.id);
  
  const transactions = transactionsData?.transactions || [];

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    // Text filter (startup name or transaction ID)
    const textFilter = 
      filter === "" || 
      transaction.startupId.toString().includes(filter) || 
      (transaction.transactionId && transaction.transactionId.toLowerCase().includes(filter.toLowerCase()));
    
    // Payment method filter
    const methodFilter = 
      paymentMethod === "all" || 
      transaction.paymentMethod === paymentMethod;
    
    // Status filter
    const statusFilter = 
      status === "all" || 
      transaction.status === status;
    
    // Date range filter
    let dateFilter = true;
    if (dateRange.from) {
      const transactionDate = new Date(transaction.createdAt);
      
      if (dateRange.to) {
        // Add one day to include the end date
        const adjustedEndDate = addDays(dateRange.to, 1);
        dateFilter = transactionDate >= dateRange.from && transactionDate <= adjustedEndDate;
      } else {
        dateFilter = transactionDate >= dateRange.from;
      }
    }
    
    return textFilter && methodFilter && statusFilter && dateFilter;
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
      <p className="text-gray-600 mb-8">Track and filter your investment transactions</p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search by startup or transaction ID..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="metamask">MetaMask</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onFromChange={(date) => setDateRange(prev => ({ ...prev, from: date }))}
              onToChange={(date) => setDateRange(prev => ({ ...prev, to: date }))}
            />
          </div>
        </CardContent>
      </Card>

      <TransactionList 
        transactions={filteredTransactions} 
        isLoading={isLoading} 
        showStartup={user?.role === "investor"}
        showInvestor={user?.role === "founder"}
      />
    </div>
  );
};

export default Transactions;
