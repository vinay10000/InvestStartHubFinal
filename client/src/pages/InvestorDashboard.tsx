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
import { FirebaseStartup as DBFirebaseStartup, FirebaseTransaction as DBFirebaseTransaction } from "@/firebase/database";

const InvestorDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  // Handle extracting the user ID from the auth context
  // Firebase UID should be available as user.uid added in AuthContext
  const userId = user ? (user.uid || user.id || "") : "";
  console.log("Current auth state (investor):", { user, userId, authLoading, userDetails: JSON.stringify(user) });
  
  const { useAllStartups } = useStartups();
  const { getTransactionsByInvestorId } = useTransactions();
  const [filter, setFilter] = useState("");
  const [stage, setStage] = useState("all");
  const [activeTab, setActiveTab] = useState("discover");
  
  // Define local interfaces for type safety
  type FirebaseStartup = {
    id: string;
    name: string;
    description: string;
    category?: string | null;
    investment_stage?: string;
    founderId: string;
    funding_goal?: string;
    funding_goal_eth?: string;
    current_funding?: string;
    logo_url?: string | null;
    website_url?: string | null;
    upi_id?: string | null;
    upi_qr_code?: string | null;
    pitch?: string;
    createdAt?: string;
  };
  
  type FirebaseTransaction = {
    id: string;
    startupId: string;
    investorId: string;
    amount: string;
    status: string;
    paymentMethod: string;
    transactionId?: string | null;
    createdAt?: string;
  };
  
  const [firebaseStartups, setFirebaseStartups] = useState<FirebaseStartup[]>([]);
  const [firebaseTransactions, setFirebaseTransactions] = useState<FirebaseTransaction[]>([]);

  // Load startups and transactions from Firebase Realtime Database
  useEffect(() => {
    const fetchAllStartups = async () => {
      try {
        const { getStartups } = await import('@/firebase/database');
        const startups = await getStartups();
        console.log("Fetched startups from Firebase Realtime Database:", startups);
        
        // Ensure all startups have an id
        const validStartups = startups
          .filter(startup => startup !== null)
          .map(startup => ({
            ...startup,
            id: startup.id || crypto.randomUUID() // Ensure id is never undefined
          })) as FirebaseStartup[];
          
        setFirebaseStartups(validStartups);
      } catch (error) {
        console.error("Error fetching startups from Firebase Realtime Database:", error);
      }
    };
    
    const fetchTransactions = async () => {
      if (userId && typeof userId === 'string' && userId.length > 20) {
        try {
          const { getTransactionsByInvestorId } = await import('@/firebase/database');
          const transactions = await getTransactionsByInvestorId(userId);
          console.log("Fetched transactions from Firebase Realtime Database:", transactions);
          
          // Ensure all transactions have an id
          const validTransactions = transactions
            .filter(transaction => transaction !== null)
            .map(transaction => ({
              ...transaction,
              id: transaction.id || crypto.randomUUID(), // Ensure id is never undefined
              startupId: String(transaction.startupId || ""),
              investorId: String(transaction.investorId || "")
            })) as FirebaseTransaction[];
            
          setFirebaseTransactions(validTransactions);
        } catch (error) {
          console.error("Error fetching transactions from Firebase Realtime Database:", error);
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
        // Create a fully typed startup with appropriate field names
        const typedStartup: FirebaseStartup = {
          id: String(startup.id || crypto.randomUUID()),
          name: startup.name,
          description: startup.description,
          category: startup.category,
          // Map fields consistently using Firebase naming convention
          investment_stage: startup.investment_stage || 
            (startup as any).investmentStage || "seed",
          founderId: String(startup.founderId || 
            (startup as any).founder_id || ""),
          funding_goal: startup.funding_goal || 
            (startup as any).fundingGoal || "",
          logo_url: startup.logo_url || 
            (startup as any).logoUrl || null,
          upi_qr_code: startup.upi_qr_code || 
            (startup as any).upiQrCode || null,
          website_url: startup.website_url || 
            (startup as any).websiteUrl || null,
          pitch: startup.pitch || "",
          createdAt: startup.createdAt ? startup.createdAt.toString() : new Date().toISOString()
        };
        return typedStartup;
      })
    : [];
    
  const apiTransactions = transactionsData?.transactions
    ? transactionsData.transactions.map(transaction => {
        // Create a fully typed transaction with appropriate field names
        const typedTransaction: FirebaseTransaction = {
          id: String(transaction.id || crypto.randomUUID()),
          amount: transaction.amount,
          status: transaction.status,
          startupId: String(transaction.startupId || ""),
          investorId: String(transaction.investorId || ""),
          paymentMethod: transaction.paymentMethod || "card",
          transactionId: transaction.transactionId || null,
          createdAt: transaction.createdAt ? transaction.createdAt.toString() : new Date().toISOString()
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
      if (t.startupId) {
        const id = String(t.startupId);
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
    
    // Use only the Firebase field name for consistency
    const investmentStage = startup.investment_stage || '';
    
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
