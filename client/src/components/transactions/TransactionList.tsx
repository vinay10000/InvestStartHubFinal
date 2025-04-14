import { useState } from "react";
import { Link } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@shared/schema";
import { 
  formatDate, 
  formatCurrency, 
  getPaymentMethodColor, 
  getTransactionStatusColor 
} from "@/lib/utils";
import { Building2, DollarSign, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  showStartup?: boolean;
  showInvestor?: boolean;
}

const TransactionList = ({ 
  transactions, 
  isLoading, 
  showStartup = true, 
  showInvestor = true 
}: TransactionListProps) => {
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No transactions found</h3>
          <p className="text-muted-foreground text-center">
            Your transaction history will appear here when you make or receive investments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {showStartup && <TableHead>Startup</TableHead>}
                {showInvestor && <TableHead>Investor</TableHead>}
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const { bg: methodBg, text: methodText } = getPaymentMethodColor(transaction.paymentMethod);
                const { bg: statusBg, text: statusText } = getTransactionStatusColor(transaction.status);
                
                return (
                  <TableRow key={transaction.id}>
                    {showStartup && (
                      <TableCell>
                        <Link href={`/startup/${transaction.startupId}`}>
                          <div className="flex items-center space-x-2 cursor-pointer">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="font-medium">Startup #{transaction.startupId}</span>
                          </div>
                        </Link>
                      </TableCell>
                    )}
                    
                    {showInvestor && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-accent" />
                          <span>Investor #{transaction.investorId}</span>
                        </div>
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <span className="font-medium">{formatCurrency(parseFloat(transaction.amount))}</span>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={`${methodBg} ${methodText}`}>
                        {transaction.paymentMethod === "metamask" ? "MetaMask" : "UPI"}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-gray-600 text-sm">
                        {formatDate(transaction.createdAt)}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={`${statusBg} ${statusText}`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {transaction.transactionId ? (
                        <span className="text-xs font-mono text-gray-600 truncate max-w-[100px] inline-block">
                          {transaction.transactionId}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionList;
