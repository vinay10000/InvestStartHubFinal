import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStartups } from "@/hooks/useStartups";
import { useDocuments } from "@/hooks/useDocuments";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, FileText, DollarSign, Users } from "lucide-react";
import StartupForm from "@/components/startups/StartupForm";
import StartupCard from "@/components/startups/StartupCard";
import DocumentUpload from "@/components/startups/DocumentUpload";
import DocumentUploadSection from "@/components/startups/DocumentUploadSection";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/hooks/useTransactions";
import TransactionList from "@/components/transactions/TransactionList";

const FounderDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id || "";
  const { useFounderStartups, useCreateStartup } = useStartups();
  const { getTransactionsByFounderId } = useTransactions();
  const documents = useDocuments();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("startups");
  const [selectedStartupId, setSelectedStartupId] = useState<string | number | null>(null);
  const [myStartups, setMyStartups] = useState<any[]>([]); // Store startups in state

  // Wait for auth to resolve before making data queries
  const { data: startupsData, isLoading: startupsLoading } = useFounderStartups();
  
  // Load startups from Firebase if using Firebase auth
  useEffect(() => {
    const fetchStartups = async () => {
      if (userId && typeof userId === 'string' && userId.length > 20) {
        try {
          const { getFirestoreStartupsByFounderId } = await import('@/firebase/firestore');
          const founderStartups = await getFirestoreStartupsByFounderId(userId);
          console.log("Fetched founder startups from Firestore:", founderStartups);
          setMyStartups(founderStartups);
        } catch (error) {
          console.error("Error fetching startups from Firestore:", error);
        }
      }
    };
    
    if (userId) {
      fetchStartups();
    }
  }, [userId]);
  
  // Convert to a number for API call
  const userIdNumber = userId ? (typeof userId === 'string' ? 
    parseInt(userId) : userId) : undefined;
    
  const { data: transactionsData, isLoading: transactionsLoading } = getTransactionsByFounderId(userIdNumber?.toString());
  
  // Create startup mutation
  const createStartupMutation = useCreateStartup();

  const handleCreateStartup = async (startupData: any) => {
    try {
      // Make sure all required fields are present and properly formatted
      // Convert founderId to a proper number if it's not already
      const userIdAsNumber = userId ? parseInt(userId.toString()) : 1;
      
      // Handle UPI QR Code file upload if provided
      let upiQrCodeUrl = null;
      if (startupData.upiQrCodeFile) {
        try {
          // Import the imagekit service dynamically
          const { uploadUpiQRCode } = await import('@/services/imagekit');
          upiQrCodeUrl = await uploadUpiQRCode(userIdAsNumber, startupData.upiQrCodeFile);
        } catch (uploadError) {
          console.error("Error uploading UPI QR code:", uploadError);
          // Continue with creation even if the upload fails
        }
      }
      
      const startupPayload = {
        ...startupData,
        founderId: userIdAsNumber, // Make sure this is a number
        // Ensure these fields are present or set defaults
        category: startupData.category || null,
        fundingGoal: startupData.fundingGoalEth || "1", // Use the ETH funding goal
        fundingGoalEth: startupData.fundingGoalEth || "1", // Store as a separate field too
        currentFunding: startupData.currentFunding || "0",
        logoUrl: startupData.logoUrl || null,
        websiteUrl: startupData.websiteUrl || null,
        // Handle empty strings for optional fields
        upiId: startupData.upiId || null,
        upiQrCode: upiQrCodeUrl || startupData.upiQrCode || null,
      };
      
      // Remove the file from the payload as we've extracted the URL
      delete startupPayload.upiQrCodeFile;
      
      console.log("Creating startup with data:", startupPayload);
      
      // Use Firebase directly if we have a firebase auth user
      if (typeof userId === 'string' && userId.length > 20) {
        // Import firebase operations dynamically
        const { createFirestoreStartup, getFirestoreStartup } = await import('@/firebase/firestore');
        const startupId = await createFirestoreStartup(startupPayload);
        console.log('Startup created in Firestore with ID:', startupId);
        
        // Fetch the newly created startup and add it to our local state
        try {
          const startupData = await getFirestoreStartup(startupId);
          if (startupData) {
            setMyStartups(prev => [...prev, startupData]);
            console.log("Added new startup to local state:", startupData);
          }
        } catch (error) {
          console.error("Error fetching new startup:", error);
        }
        
        setIsCreateDialogOpen(false);
      } else {
        // Use regular API for local testing
        const result = await createStartupMutation.mutateAsync(startupPayload);
        
        // Add the startup to local state immediately
        if (result) {
          setMyStartups(prev => [...prev, result]);
        }
        
        setIsCreateDialogOpen(false);
      }
    } catch (error) {
      console.error("Error creating startup:", error);
    }
  };

  // Combine startups from both sources (Firebase and API)
  const apiStartups = startupsData?.startups || [];
  const combinedStartups = myStartups.length > 0 ? myStartups : apiStartups;
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
                  {startupsLoading && myStartups.length === 0 ? <Skeleton className="h-8 w-16" /> : combinedStartups.length}
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
          <TabsTrigger value="documents">Documents</TabsTrigger>
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

          {startupsLoading && myStartups.length === 0 ? (
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
          ) : combinedStartups.length === 0 ? (
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
              {combinedStartups.map((startup) => (
                <StartupCard key={startup.id} startup={startup} view="founder" />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="documents">
          <h2 className="text-2xl font-bold mb-6">Startup Documents</h2>
          
          {startupsLoading && myStartups.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-3/4 mb-4" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ) : combinedStartups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No startups to upload documents for</h3>
                <p className="text-muted-foreground text-center mb-4">Create a startup first to upload essential documents</p>
                <Button onClick={() => {
                  setActiveTab("startups");
                  setTimeout(() => setIsCreateDialogOpen(true), 100);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Startup
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Select a Startup</CardTitle>
                  <CardDescription>Choose the startup you want to upload documents for</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {combinedStartups.map((startup) => (
                      <Card 
                        key={startup.id} 
                        className={`cursor-pointer transition-all ${selectedStartupId === startup.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                        onClick={() => setSelectedStartupId(startup.id)}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          {startup.logoUrl ? (
                            <img 
                              src={startup.logoUrl} 
                              alt={startup.name} 
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-medium">{startup.name}</h3>
                            <p className="text-sm text-muted-foreground">{startup.category}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {selectedStartupId ? (
                <DocumentUploadSection 
                  startupId={String(selectedStartupId)}
                  onDocumentUpload={async (file, documentType, startupId) => {
                    await documents.uploadDocumentFile({
                      startupId,
                      documentType,
                      file,
                      name: file.name
                    });
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-8">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">Select a startup</h3>
                    <p className="text-muted-foreground text-center">
                      Choose a startup from above to upload documents
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
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
