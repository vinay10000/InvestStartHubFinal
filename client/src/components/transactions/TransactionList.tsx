import React from "react";
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  ExternalLink, 
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  IndianRupee
} from "lucide-react";
import { formatDate, formatCurrency, truncateAddress } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction } from "@shared/schema";

interface TransactionListProps {
  transactions: Transaction[];
  startups?: any[]; // Optional startup data to show names instead of just IDs
  viewType?: "table" | "list";
  loading?: boolean;
  showStartupInfo?: boolean;
  showInvestorInfo?: boolean;
  maxItems?: number;
  title?: string;
  description?: string;
  emptyMessage?: string;
  onVerifyTransaction?: (transaction: Transaction, status: string) => void;
  filterByStatus?: string[];
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  startups = [],
  viewType = "table",
  loading = false,
  showStartupInfo = true,
  showInvestorInfo = false,
  maxItems,
  title = "Transactions",
  description = "Your investment transaction history",
  emptyMessage = "No transactions yet",
  onVerifyTransaction,
  filterByStatus,
}) => {
  // If loading, show skeleton UI
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter transactions if needed
  const filteredTransactions = filterByStatus
    ? transactions.filter(t => filterByStatus.includes(t.status))
    : transactions;

  // Limit transactions if maxItems is specified
  const displayedTransactions = maxItems
    ? filteredTransactions.slice(0, maxItems)
    : filteredTransactions;

  // Sort transactions by creation date (newest first)
  const sortedTransactions = [...displayedTransactions].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  // Get startup name by ID
  const getStartupName = (startupId: number) => {
    const startup = startups.find(s => s.id === startupId);
    return startup ? startup.name : `Startup #${startupId}`;
  };

  // Render status badge
  const renderStatus = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">
            <Clock className="mr-1 h-3 w-3" /> Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
            <XCircle className="mr-1 h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">{status}</Badge>
        );
    }
  };

  // Render payment method
  const renderPaymentMethod = (method: string) => {
    switch (method) {
      case "metamask":
        return (
          <div className="flex items-center">
            <Wallet className="mr-1 h-4 w-4" /> 
            <span>MetaMask</span>
          </div>
        );
      case "upi":
        return (
          <div className="flex items-center">
            <IndianRupee className="mr-1 h-4 w-4" /> 
            <span>UPI</span>
          </div>
        );
      default:
        return method;
    }
  };

  // Render transaction ID
  const renderTransactionId = (transactionId: string, paymentMethod: string) => {
    if (!transactionId) return "N/A";

    if (paymentMethod === "metamask") {
      // For MetaMask, show truncated transaction hash with Etherscan link
      return (
        <div className="flex items-center gap-1">
          <span className="font-mono">{truncateAddress(transactionId)}</span>
          <a 
            href={`https://sepolia.etherscan.io/tx/${transactionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      );
    }
    
    // For other payment methods, just show the transaction ID
    return <span className="font-mono text-xs">{transactionId}</span>;
  };

  // If no transactions, show empty state
  if (sortedTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  // Table view
  if (viewType === "table") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                {showStartupInfo && <TableHead>Startup</TableHead>}
                {showInvestorInfo && <TableHead>Investor</TableHead>}
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                {onVerifyTransaction && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(transaction.createdAt || new Date())}
                  </TableCell>
                  
                  {showStartupInfo && (
                    <TableCell>
                      {getStartupName(transaction.startupId)}
                    </TableCell>
                  )}
                  
                  {showInvestorInfo && (
                    <TableCell>
                      {transaction.investorId}
                    </TableCell>
                  )}
                  
                  <TableCell className="font-medium">
                    {formatCurrency(parseFloat(transaction.amount.toString()))}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col">
                      {renderPaymentMethod(transaction.paymentMethod)}
                      <span className="text-xs text-muted-foreground mt-1">
                        {renderTransactionId(transaction.transactionId || '', transaction.paymentMethod)}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {renderStatus(transaction.status)}
                  </TableCell>
                  
                  {onVerifyTransaction && (
                    <TableCell>
                      {transaction.status === "pending" && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-8 bg-green-50 text-green-700 hover:bg-green-100"
                            onClick={() => onVerifyTransaction(transaction, "completed")}
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-8 bg-red-50 text-red-700 hover:bg-red-100"
                            onClick={() => onVerifyTransaction(transaction, "failed")}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        
        {maxItems && transactions.length > maxItems && (
          <CardFooter className="flex justify-center pt-2">
            <Button variant="link">
              View All Transactions
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  // List view
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-start space-x-4 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted">
                {transaction.paymentMethod === "metamask" ? (
                  <Wallet className="h-4 w-4" />
                ) : (
                  <IndianRupee className="h-4 w-4" />
                )}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none">
                    {showStartupInfo ? getStartupName(transaction.startupId) : "Investment"}
                  </p>
                  {renderStatus(transaction.status)}
                </div>
                
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <span>{formatDate(transaction.createdAt || new Date())}</span>
                  <span>•</span>
                  <span>{renderPaymentMethod(transaction.paymentMethod)}</span>
                </div>
                
                {transaction.transactionId && (
                  <div className="text-xs text-muted-foreground">
                    {renderTransactionId(transaction.transactionId, transaction.paymentMethod)}
                  </div>
                )}
              </div>
              
              <div className="flex items-center font-medium">
                {formatCurrency(parseFloat(transaction.amount.toString()))}
              </div>
              
              {onVerifyTransaction && transaction.status === "pending" && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 bg-green-50 text-green-700 hover:bg-green-100"
                    onClick={() => onVerifyTransaction(transaction, "completed")}
                  >
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 bg-red-50 text-red-700 hover:bg-red-100"
                    onClick={() => onVerifyTransaction(transaction, "failed")}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      
      {maxItems && transactions.length > maxItems && (
        <CardFooter className="flex justify-center pt-2">
          <Button variant="link">
            View All Transactions
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default TransactionList;