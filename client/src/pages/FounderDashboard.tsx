import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStartups } from "@/hooks/useStartups";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, FileText, DollarSign, Users } from "lucide-react";
import StartupForm from "@/components/startups/StartupForm";
import StartupCard from "@/components/startups/StartupCard";
import DocumentUpload from "@/components/startups/DocumentUpload";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/hooks/useTransactions";
import TransactionList from "@/components/transactions/TransactionList";

const FounderDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id || "";
  const { getStartupsByFounderId, createStartup } = useStartups();
  const { getTransactionsByFounderId } = useTransactions();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("startups");

  // Wait for auth to resolve before making data queries
  const { data: startupsData, isLoading: startupsLoading } = getStartupsByFounderId();
  
  const { data: transactionsData, isLoading: transactionsLoading } = getTransactionsByFounderId(
    userId && typeof userId === 'string' && userId.length > 0 ? userId : undefined
  );
  
  // Create startup mutation
  const createStartupMutation = createStartup();

  const handleCreateStartup = async (startupData: any) => {
    try {
      // Make sure all required fields are present and properly formatted
      const startupPayload = {
        ...startupData,
        founderId: userId,
        // Ensure these fields are present or set defaults
        category: startupData.category || null,
        fundingGoal: startupData.fundingGoal || "100000",
        currentFunding: startupData.currentFunding || "0",
        logoUrl: startupData.logoUrl || null,
        websiteUrl: startupData.websiteUrl || null,
        // Handle empty strings for optional fields
        upiId: startupData.upiId || null,
        upiQrCode: startupData.upiQrCode || null,
      };
      
      console.log("Creating startup with data:", startupPayload);
      
      await createStartupMutation.mutateAsync(startupPayload);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Error creating startup:", error);
    }
  };

  const startups = startupsData?.startups || [];
  const transactions = transactionsData?.transactions || [];

  // Calculate metrics safely
  const totalInvestors = useMemo(() => {
    const investorIds: Record<string, boolean> = {};
    transactions.forEach(t => {
      if (t.investorId) {
        const id = String(t.investorId);
        investorIds[id] = true;
      }
    });
    return Object.keys(investorIds).length;
  }, [transactions]);
  
  const totalRevenue = useMemo(() => {
    return transactions
      .filter(t => t.status === "completed")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [transactions]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Founder Dashboard</h1>
      <p className="text-gray-600 mb-8">Manage your startups and track investments</p>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Startups</p>
                <h3 className="text-2xl font-bold">
                  {startupsLoading ? <Skeleton className="h-8 w-16" /> : startups.length}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-bold">
                  {transactionsLoading ? <Skeleton className="h-8 w-20" /> : `$${totalRevenue.toFixed(2)}`}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Investors</p>
                <h3 className="text-2xl font-bold">
                  {transactionsLoading ? <Skeleton className="h-8 w-16" /> : totalInvestors}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-accent" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <h3 className="text-2xl font-bold">
                  {transactionsLoading ? <Skeleton className="h-8 w-16" /> : transactions.length}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="startups">My Startups</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="startups">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">My Startups</h2>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Startup
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Startup</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create your startup profile
                  </DialogDescription>
                </DialogHeader>
                <StartupForm onSubmit={handleCreateStartup} isLoading={createStartupMutation.isPending} />
              </DialogContent>
            </Dialog>
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
          ) : startups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No startups yet</h3>
                <p className="text-muted-foreground text-center mb-4">Create your first startup to connect with investors</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Startup
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {startups.map((startup) => (
                <StartupCard key={startup.id} startup={startup} view="founder" />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="transactions">
          <h2 className="text-2xl font-bold mb-6">Investment Transactions</h2>
          <TransactionList transactions={transactions} isLoading={transactionsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FounderDashboard;
