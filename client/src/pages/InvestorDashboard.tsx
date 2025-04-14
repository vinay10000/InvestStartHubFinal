import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStartups } from "@/hooks/useStartups";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, DollarSign } from "lucide-react";
import StartupCard from "@/components/startups/StartupCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/hooks/useTransactions";
import TransactionList from "@/components/transactions/TransactionList";

const InvestorDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id || "";
  const { getAllStartups } = useStartups();
  const { getTransactionsByInvestorId } = useTransactions();
  const [filter, setFilter] = useState("");
  const [stage, setStage] = useState("all");
  const [activeTab, setActiveTab] = useState("discover");

  // Only fetch transactions when we have a valid userId
  const { data: startupsData, isLoading: startupsLoading } = getAllStartups();
  const { data: transactionsData, isLoading: transactionsLoading } = getTransactionsByInvestorId(
    userId && typeof userId === 'string' && userId.length > 0 ? userId : undefined
  );
  
  const startups = startupsData?.startups || [];
  const transactions = transactionsData?.transactions || [];

  // Calculate metrics safely using memoization
  const totalInvested = useMemo(() => {
    return transactions
      .filter(t => t.status === "completed")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [transactions]);
  
  // Calculate unique startups invested in without using a Set iterator
  const investedStartups = useMemo(() => {
    const startupIds: Record<string, boolean> = {};
    transactions.forEach(t => {
      if (t.startupId) {
        const id = String(t.startupId);
        startupIds[id] = true;
      }
    });
    return Object.keys(startupIds).length;
  }, [transactions]);

  // Filter startups
  const filteredStartups = startups.filter(startup => {
    const matchesFilter = 
      filter === "" || 
      startup.name.toLowerCase().includes(filter.toLowerCase()) || 
      startup.description.toLowerCase().includes(filter.toLowerCase());
    
    const matchesStage = 
      stage === "all" || 
      startup.investmentStage.toLowerCase() === stage.toLowerCase();
    
    return matchesFilter && matchesStage;
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Investor Dashboard</h1>
      <p className="text-gray-600 mb-8">Discover startups and track your investments</p>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invested</p>
                <h3 className="text-2xl font-bold">
                  {transactionsLoading ? <Skeleton className="h-8 w-20" /> : `$${totalInvested.toFixed(2)}`}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Startups Invested</p>
                <h3 className="text-2xl font-bold">
                  {transactionsLoading ? <Skeleton className="h-8 w-16" /> : investedStartups}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="discover">Discover Startups</TabsTrigger>
          <TabsTrigger value="investments">My Investments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="discover">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Discover Startups</h2>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search startups..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Investment Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="pre-seed">Pre-seed</SelectItem>
                <SelectItem value="seed">Seed</SelectItem>
                <SelectItem value="series a">Series A</SelectItem>
                <SelectItem value="series b">Series B</SelectItem>
                <SelectItem value="series c">Series C</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {startupsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-6">
                      <Skeleton className="h-6 w-2/3 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredStartups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No startups found</h3>
                <p className="text-muted-foreground text-center">Try adjusting your search filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStartups.map((startup) => (
                <StartupCard key={startup.id} startup={startup} view="investor" />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="investments">
          <h2 className="text-2xl font-bold mb-6">My Investments</h2>
          <TransactionList transactions={transactions} isLoading={transactionsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestorDashboard;
