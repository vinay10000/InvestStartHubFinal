import { useState, useMemo, useEffect } from "react";
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
  const { useAllStartups } = useStartups();
  const { getTransactionsByInvestorId } = useTransactions();
  const [filter, setFilter] = useState("");
  const [stage, setStage] = useState("all");
  const [activeTab, setActiveTab] = useState("discover");
  // Use explicit types for Firebase data
  interface FirebaseStartup {
    id: string;
    name: string;
    description: string;
    category?: string | null;
    investment_stage?: string;
    investmentStage?: string;
    founderId: string | number;
    founder_id?: string | number;
    logoUrl?: string | null;
    upiQrCode?: string | null;
    [key: string]: any; // Allow for other properties
  }
  
  interface FirebaseTransaction {
    id: string;
    amount: string;
    status: string;
    startupId?: string | number;
    startup_id?: string | number;
    investorId?: string | number;
    investor_id?: string | number;
    [key: string]: any; // Allow for other properties
  }
  
  const [firebaseStartups, setFirebaseStartups] = useState<FirebaseStartup[]>([]);
  const [firebaseTransactions, setFirebaseTransactions] = useState<FirebaseTransaction[]>([]);

  // Load startups and transactions from Firebase Realtime Database
  useEffect(() => {
    const fetchAllStartups = async () => {
      try {
        const { getStartups } = await import('@/firebase/database');
        const startups = await getStartups();
        console.log("Fetched startups from Firebase Realtime Database:", startups);
        setFirebaseStartups(startups);
      } catch (error) {
        console.error("Error fetching startups from Firebase Realtime Database:", error);
      }
    };
    
    const fetchTransactions = async () => {
      if (userId && typeof userId === 'string' && userId.length > 20) {
        try {
          const { getFirestoreTransactionsByInvestorId } = await import('@/firebase/firestore');
          const transactions = await getFirestoreTransactionsByInvestorId(userId);
          console.log("Fetched transactions from Firestore:", transactions);
          setFirebaseTransactions(transactions);
        } catch (error) {
          console.error("Error fetching transactions from Firestore:", error);
        }
      }
    };
    
    fetchAllStartups();
    fetchTransactions();
  }, [userId]);
  
  // Only fetch transactions when we have a valid userId
  const { data: startupsData, isLoading: startupsLoading } = useAllStartups();
  const { data: transactionsData, isLoading: transactionsLoading } = getTransactionsByInvestorId(
    userId && typeof userId === 'string' && userId.length > 0 ? userId : undefined
  );
  
  // Combine startups and transactions from both sources (Firebase and API)
  // Type the API responses explicitly 
  interface ApiStartupResponse {
    startups: FirebaseStartup[];
  }
  
  interface ApiTransactionResponse {
    transactions: FirebaseTransaction[];
  }
  
  // Transform API responses to match Firebase format
  const apiStartups = startupsData?.startups 
    ? startupsData.startups.map(startup => {
        const typedStartup: FirebaseStartup = {
          id: startup.id.toString(),
          name: startup.name,
          description: startup.description,
          category: startup.category,
          investmentStage: startup.investmentStage,
          investment_stage: startup.investment_stage,
          founderId: startup.founderId || startup.founder_id,
          founder_id: startup.founder_id || startup.founderId,
          logoUrl: startup.logoUrl || startup.logo_url,
          upiQrCode: startup.upiQrCode || startup.upi_qr_code,
          ...startup
        };
        return typedStartup;
      })
    : [];
    
  const apiTransactions = transactionsData?.transactions
    ? transactionsData.transactions.map(transaction => {
        const typedTransaction: FirebaseTransaction = {
          id: transaction.id.toString(),
          amount: transaction.amount,
          status: transaction.status,
          startupId: transaction.startupId,
          startup_id: transaction.startup_id,
          investorId: transaction.investorId,
          investor_id: transaction.investor_id,
          ...transaction
        };
        return typedTransaction;
      })
    : [];
  
  const combinedStartups = firebaseStartups.length > 0 ? firebaseStartups : apiStartups;
  const combinedTransactions = firebaseTransactions.length > 0 ? firebaseTransactions : apiTransactions;

  // Calculate metrics safely using memoization
  const totalInvested = useMemo(() => {
    return combinedTransactions
      .filter(t => t.status === "completed")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [combinedTransactions]);
  
  // Calculate unique startups invested in without using a Set iterator
  const investedStartups = useMemo(() => {
    const startupIds: Record<string, boolean> = {};
    combinedTransactions.forEach(t => {
      if (t.startupId || t.startup_id) {
        const id = String(t.startupId || t.startup_id);
        startupIds[id] = true;
      }
    });
    return Object.keys(startupIds).length;
  }, [combinedTransactions]);

  // Filter startups
  const filteredStartups = combinedStartups.filter(startup => {
    const matchesFilter = 
      filter === "" || 
      startup.name.toLowerCase().includes(filter.toLowerCase()) || 
      startup.description.toLowerCase().includes(filter.toLowerCase());
    
    // Handle different field names between Firebase and API
    const investmentStage = startup.investmentStage || startup.investment_stage || '';
    
    const matchesStage = 
      stage === "all" || 
      investmentStage.toLowerCase() === stage.toLowerCase();
    
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
                  {transactionsLoading && firebaseTransactions.length === 0 ? <Skeleton className="h-8 w-20" /> : `$${totalInvested.toFixed(2)}`}
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
                  {transactionsLoading && firebaseTransactions.length === 0 ? <Skeleton className="h-8 w-16" /> : investedStartups}
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

          {startupsLoading && firebaseStartups.length === 0 ? (
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
          <TransactionList transactions={combinedTransactions} isLoading={transactionsLoading && firebaseTransactions.length === 0} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestorDashboard;
