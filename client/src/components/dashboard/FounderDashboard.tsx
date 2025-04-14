import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BarChart3, 
  Users, 
  TrendingUp,
  Plus,
  Building2,
  FileText
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useStartups } from "@/hooks/useStartups";
import { useAuth } from "@/hooks/useAuth";
import { useTransactions } from "@/hooks/useTransactions";
import TransactionList from "@/components/transactions/TransactionList";
import StartupCard from "@/components/startups/StartupCard";
import { useContractInteraction } from "@/hooks/useContractInteraction";
import { useWeb3 } from "@/hooks/useWeb3";

const FounderDashboard = () => {
  const { user } = useAuth();
  const { address } = useWeb3();
  const { getStartupsByFounderId } = useStartups(user?.id);
  const { getTransactionsByFounderId } = useTransactions();
  const contractInteraction = useContractInteraction();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch startups
  const { data: startupsData, isLoading: isLoadingStartups } = getStartupsByFounderId();
  const startups = startupsData?.startups || [];

  // Fetch transactions - handle both Firebase string IDs and local numeric IDs
  const { data: transactionsData, isLoading: isLoadingTransactions } = getTransactionsByFounderId(user?.id);
  const transactions = transactionsData?.transactions || [];
  
  // Log for debugging
  console.log("Loaded transactions:", transactions.length, "Loading state:", isLoadingTransactions);

  // Calculate dashboard stats
  const totalInvestments = transactions.reduce((sum, transaction) => sum + parseFloat(transaction.amount.toString()), 0);
  const pendingInvestments = transactions
    .filter(transaction => transaction.status === "pending")
    .reduce((sum, transaction) => sum + parseFloat(transaction.amount.toString()), 0);
  const uniqueInvestors = new Set(transactions.map(transaction => transaction.investorId)).size;

  // Fetch on-chain data for each startup (if available)
  const [onChainStartups, setOnChainStartups] = useState<any[]>([]);
  const [isLoadingOnChain, setIsLoadingOnChain] = useState(false);

  useEffect(() => {
    const fetchOnChainData = async () => {
      if (startups.length === 0 || !address) return;
      
      setIsLoadingOnChain(true);
      try {
        const onChainData = await Promise.all(
          startups.map(async (startup) => {
            try {
              // Placeholder for contract interaction
              // const contractData = await contractInteraction.getStartup(startup.id);
              const contractData = null;
              if (contractData) {
                return { ...startup, onChain: contractData };
              }
            } catch (error) {
              console.error(`Error fetching on-chain data for startup ${startup.id}:`, error);
            }
            return startup;
          })
        );
        
        setOnChainStartups(onChainData);
      } catch (error) {
        console.error("Error fetching on-chain data:", error);
      } finally {
        setIsLoadingOnChain(false);
      }
    };
    
    fetchOnChainData();
  }, [startups, address]);

  // Handle loading states
  if (isLoadingStartups && startups.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  // Handle empty state
  if (!isLoadingStartups && startups.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Founder Dashboard</h1>
        
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No startups yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              You haven't created any startups yet. Start by registering your startup to receive investments.
            </p>
            <Link href="/startup/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Register Startup
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Founder Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your startups and track investments
          </p>
        </div>
        
        <Link href="/startup/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Register Startup
          </Button>
        </Link>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestments)}</div>
            <p className="text-xs text-muted-foreground">
              Across {startups.length} startup{startups.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unique Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueInvestors}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.length} total transaction{transactions.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Investments</CardTitle>
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
          <TabsTrigger value="startups">Your Startups</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="md:col-span-4">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Your most recent investment transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionList 
                  transactions={transactions.slice(0, 5)} 
                  isLoading={isLoadingTransactions}
                  showInvestor={true}
                  showStartup={false}
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
                <CardTitle>Your Startups</CardTitle>
                <CardDescription>
                  Manage your registered startups
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {startups.map((startup) => (
                  <div key={startup.id} className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={startup.logoUrl || ""} alt={startup.name} />
                      <AvatarFallback>{startup.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">{startup.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(typeof startup.fundingGoal === 'string' ? parseFloat(startup.fundingGoal) : (startup.fundingGoal || 0))}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {startup.category || 'Tech'} • {startup.investmentStage || 'Seed'}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("startups")}>
                  View All Startups
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="startups">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {startups.map((startup) => (
              <StartupCard 
                key={startup.id} 
                startup={
                  // Only passing through the original startup object which matches the Startup type
                  startup
                }
                onChainData={onChainStartups.find(s => s.id === startup.id)?.onChain}
                isLoadingOnChain={isLoadingOnChain}
              />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All investments in your startups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionList 
                transactions={transactions} 
                isLoading={isLoadingTransactions}
                showInvestor={true}
                showStartup={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Legal documents, pitch decks, and reports for your startups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-8 text-center">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">Documents Coming Soon</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  This feature is under development. Soon you'll be able to upload and manage
                  all your startup-related documents here.
                </p>
                <Button variant="outline" disabled>
                  Upload Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FounderDashboard;