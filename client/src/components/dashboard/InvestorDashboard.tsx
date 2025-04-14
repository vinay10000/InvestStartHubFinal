import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BarChart3, 
  TrendingUp,
  Briefcase,
  Search,
  Building2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useStartups } from "@/hooks/useStartups";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import TransactionList from "@/components/transactions/TransactionList";
import StartupCard from "@/components/startups/StartupCard";
import { useContractInteraction } from "@/hooks/useContractInteraction";
import { useWeb3 } from "@/hooks/useWeb3";

const InvestorDashboard = () => {
  const { user } = useAuth();
  const { address } = useWeb3();
  const { data: startupsData, isLoading: isLoadingStartups } = useStartups().getAllStartups();
  const { getTransactionsByInvestorId } = useTransactions();
  const { getAllStartups } = useContractInteraction();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch startups with safety check
  const startups = startupsData?.startups || [];
  console.log("Loaded startups:", startups.length, "Loading state:", isLoadingStartups);
  
  // Fetch transactions with safety check - handle both Firebase string IDs and local numeric IDs
  const { data: transactionsData, isLoading: isLoadingTransactions } = getTransactionsByInvestorId(user?.id || 0);
  const transactions = transactionsData?.transactions || [];
  console.log("Loaded transactions:", transactions.length, "Loading state:", isLoadingTransactions);
  
  // Calculate dashboard stats
  const totalInvested = transactions.reduce((sum, transaction) => sum + parseFloat(transaction.amount.toString()), 0);
  const pendingInvestments = transactions
    .filter(transaction => transaction.status === "pending")
    .reduce((sum, transaction) => sum + parseFloat(transaction.amount.toString()), 0);
  const uniqueStartups = new Set(transactions.map(transaction => transaction.startupId)).size;
  
  // Fetch on-chain startups
  const [onChainStartups, setOnChainStartups] = useState<any[]>([]);
  const [isLoadingOnChain, setIsLoadingOnChain] = useState(false);
  
  useEffect(() => {
    const fetchOnChainStartups = async () => {
      if (!address) return;
      
      setIsLoadingOnChain(true);
      try {
        const chainStartups = await getAllStartups();
        setOnChainStartups(chainStartups);
      } catch (error) {
        console.error("Error fetching on-chain startups:", error);
      } finally {
        setIsLoadingOnChain(false);
      }
    };
    
    if (address) {
      fetchOnChainStartups();
    }
  }, [address, getAllStartups]);
  
  // Get portfolio startups (ones the investor has invested in)
  const portfolioStartupIds = new Set(transactions.map(t => t.startupId));
  const portfolioStartups = startups.filter(startup => portfolioStartupIds.has(startup.id));
  
  // Handle loading states
  if (isLoadingTransactions && transactions.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Investor Dashboard</h1>
          <p className="text-muted-foreground">
            Track your investments and discover startups
          </p>
        </div>
        
        <Link href="/startups">
          <Button>
            <Search className="mr-2 h-4 w-4" />
            Discover Startups
          </Button>
        </Link>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
            <p className="text-xs text-muted-foreground">
              Across {uniqueStartups} startup{uniqueStartups !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Investments</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">
              Total transactions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingInvestments)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="md:col-span-4">
              <CardHeader>
                <CardTitle>Recent Investments</CardTitle>
                <CardDescription>
                  Your most recent startup investments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionList 
                  transactions={transactions.slice(0, 5)} 
                  isLoading={isLoadingTransactions}
                  showInvestor={false}
                  showStartup={true}
                />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("transactions")}>
                  View All Transactions
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Your Portfolio</CardTitle>
                <CardDescription>
                  Startups you've invested in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {portfolioStartups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">
                      You haven't invested in any startups yet
                    </p>
                    <Link href="/startups">
                      <Button variant="link" className="mt-2">
                        Discover Startups
                      </Button>
                    </Link>
                  </div>
                ) : (
                  portfolioStartups.map((startup) => (
                    <div key={startup.id} className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={startup.logoUrl || ""} alt={startup.name} />
                        <AvatarFallback>{startup.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium leading-none">{startup.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(
                              transactions
                                .filter(t => t.startupId === startup.id)
                                .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)
                            )}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {startup.category || 'Tech'} • {startup.investmentStage || 'Seed'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("portfolio")}>
                  View Full Portfolio
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="portfolio">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {portfolioStartups.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Your portfolio is empty</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    Start investing in startups to build your portfolio and track your investments.
                  </p>
                  <Link href="/startups">
                    <Button>
                      <Search className="mr-2 h-4 w-4" />
                      Discover Startups
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              portfolioStartups.map((startup) => (
                <StartupCard 
                  key={startup.id} 
                  startup={{
                    ...startup,
                    stage: startup.investmentStage || 'Seed',
                    category: startup.category || 'Technology',
                    fundingGoal: startup.fundingGoal || 0,
                    currentFunding: startup.currentFunding || 0,
                    logoUrl: startup.logoUrl || '',
                    websiteUrl: startup.websiteUrl || ''
                  }}
                  onChainData={onChainStartups.find(s => s.id === startup.id)}
                  isLoadingOnChain={isLoadingOnChain}
                />
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Your complete investment history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionList 
                transactions={transactions} 
                isLoading={isLoadingTransactions}
                showInvestor={false}
                showStartup={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="discover">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Discover Startups</CardTitle>
              <CardDescription>
                Find promising startups to invest in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {isLoadingStartups ? (
                  Array(3).fill(0).map((_, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-8 w-full mt-4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : startups.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
                    <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">No startups available</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Check back later for new investment opportunities
                    </p>
                  </div>
                ) : (
                  startups.slice(0, 3).map((startup) => (
                    <StartupCard 
                      key={startup.id} 
                      startup={{
                        ...startup,
                        stage: startup.investmentStage || 'Seed',
                        category: startup.category || 'Technology',
                        fundingGoal: startup.fundingGoal || 0,
                        currentFunding: startup.currentFunding || 0,
                        logoUrl: startup.logoUrl || '',
                        websiteUrl: startup.websiteUrl || ''
                      }}
                      onChainData={onChainStartups.find(s => s.id === startup.id)}
                      isLoadingOnChain={isLoadingOnChain}
                    />
                  ))
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/startups">
                <Button className="w-full">View All Startups</Button>
              </Link>
            </CardFooter>
          </Card>
          
          {onChainStartups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>On-Chain Startups</CardTitle>
                <CardDescription>
                  Verified startups on the blockchain
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {isLoadingOnChain ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <p className="col-span-full p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
                      On-chain startups will be displayed here when they're available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestorDashboard;