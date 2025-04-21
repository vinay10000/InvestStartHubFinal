import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/MongoAuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, FileText, DollarSign, Users, BarChart2, PieChart } from "lucide-react";
import InvestmentAnalytics from "@/components/dashboard/InvestmentAnalytics";
import StartupForm from "@/components/startups/StartupForm";
import StartupCard from "@/components/startups/StartupCard";
import DocumentUpload from "@/components/startups/DocumentUpload";
import DocumentUploadSection from "@/components/startups/DocumentUploadSection";
import { Skeleton } from "@/components/ui/skeleton";
import TransactionList from "@/components/transactions/TransactionList";
import { Startup } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
// MongoDB imports for database operations
import { useToast } from "@/hooks/use-toast";
import { 
  createStartup as mongoCreateStartup,
  updateStartup as mongoUpdateStartup, 
  createDocument as mongoCreateDocument,
  MongoStartup 
} from "@/mongodb/database";
import SampleWalletCleaner from "@/components/utils/SampleWalletCleaner";

const FounderDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Make sure we wait for auth to complete before accessing user data
  // MongoDB auth directly provides user.id
  const userId = user ? user.id.toString() : "";
  
  // Debug auth state to diagnose issues
  useEffect(() => {
    console.log("Current auth state:", { 
      user, 
      userId, 
      authLoading,
      hasID: user?.id ? "yes" : "no", 
      userDetails: user ? JSON.stringify(user) : "null" 
    });
  }, [user, userId, authLoading]);
  
  // No longer using hooks that depend on Supabase
  // We'll use MongoDB functions directly
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("startups");
  
  // Check if we're in a development environment for additional tooling options
  const isDevEnvironment = useMemo(() => {
    return window.location.hostname.includes('localhost') || 
           window.location.hostname.includes('replit.dev') || 
           window.location.hostname.includes('repl.co');
  }, []);
  const [selectedStartupId, setSelectedStartupId] = useState<string | number | null>(null);
  // Define types for MongoDB data (with backward compatibility)
  interface MongoStartupData {
    id?: string;
    name: string;
    description: string;
    category?: string | null;
    investment_stage?: string;
    investmentStage?: string;
    founderId: string | number;
    founder_id?: string | number;
    logoUrl?: string | null;
    logo_url?: string | null;
    upiQrCode?: string | null;
    upi_qr_code?: string | null;
    upi_id?: string | null;
    [key: string]: any; // Allow for other properties
  }
  
  const [myStartups, setMyStartups] = useState<MongoStartupData[]>([]); // Store startups in state
  const [adaptedStartups, setAdaptedStartups] = useState<Startup[]>([]); // Converted startups for UI components

  // No longer using Supabase hooks for startups
  const [startupsLoading, setStartupsLoading] = useState(true);
  const [isCreatingStartup, setIsCreatingStartup] = useState(false);
  
  // Initialize empty Firebase variables for backward compatibility
  // This prevents "firebaseTransactions is not defined" errors during migration
  const [firebaseTransactions, setFirebaseTransactions] = useState<any[]>([]);
  const [firebaseStartups, setFirebaseStartups] = useState<any[]>([]);
  
  // Convert MongoDB startups to the format expected by StartupCard
  const adaptMongoStartupToUI = (mongoStartup: MongoStartupData): Startup => {
    // Store both the original MongoDB ID and a numeric ID for different use cases
    const originalId = typeof mongoStartup.id === 'string' ? mongoStartup.id : '0';
    
    // CRITICAL: We use the original MongoDB ID (like "65f0abcd1234567890abcdef") instead of 
    // converting to a number. This ensures consistency with database IDs.
    
    // Create a numeric version of the founderId for the schema type - only used internally
    let founderIdNumeric = 0;
    try {
      if (typeof mongoStartup.founderId === 'number') {
        founderIdNumeric = mongoStartup.founderId;
      } else if (typeof mongoStartup.founderId === 'string') {
        const parsed = parseInt(mongoStartup.founderId);
        founderIdNumeric = !isNaN(parsed) ? parsed : 0;
      }
    } catch (e) {
      console.error("Error parsing founderId:", e);
    }

    // Modified the type to work with both string and numeric IDs
    return {
      id: originalId as any, // Type assertion to satisfy TypeScript - we've modified the schema
      name: mongoStartup.name,
      description: mongoStartup.description,
      category: mongoStartup.category || null,
      investmentStage: mongoStartup.investment_stage || "",
      founderId: founderIdNumeric, // Use the numeric conversion for schema compatibility
      createdAt: mongoStartup.createdAt ? new Date(mongoStartup.createdAt) : new Date(),
      logoUrl: mongoStartup.logo_url || null,
      upiQrCode: mongoStartup.upi_qr_code || null,
      pitch: mongoStartup.pitch || "",
      fundingGoal: mongoStartup.funding_goal || "0",
      currentFunding: mongoStartup.current_funding || "0",
      websiteUrl: mongoStartup.website_url || null,
      upiId: mongoStartup.upi_id || null,
      // Add required fields that might be missing
      mediaUrls: mongoStartup.mediaUrls || [],
      videoUrl: mongoStartup.videoUrl || null
    };
  };
  
  // Load startups directly from MongoDB
  const { data: mongoStartups, isLoading: mongoStartupsLoading } = useQuery({
    queryKey: ['/api/startups/founder', userId],
    queryFn: async () => {
      if (!userId) return { startups: [] };
      try {
        const response = await apiRequest('GET', `/api/startups/founder/${userId}`);
        const data = await response.json();
        console.log("[FounderDashboard] MongoDB startups fetched:", data);
        return data;
      } catch (error) {
        console.error("[FounderDashboard] Error fetching startups from MongoDB:", error);
        return { startups: [] };
      }
    },
    enabled: !!userId,
  });
  
  // Update startup states when MongoDB data is loaded
  useEffect(() => {
    if (mongoStartups?.startups && !mongoStartupsLoading) {
      console.log("[FounderDashboard] Setting startups from MongoDB:", mongoStartups.startups);
      
      // Format startups for UI consistency
      const formattedStartups = mongoStartups.startups.map((startup: any) => ({
        id: startup.id || '',
        name: startup.name || 'Unnamed Startup',
        description: startup.description || '',
        category: startup.category,
        investment_stage: startup.investmentStage,
        investmentStage: startup.investmentStage || 'Seed',
        founder_id: startup.founderId || userId,
        founderId: startup.founderId || userId,
        logo_url: startup.logoUrl,
        logoUrl: startup.logoUrl,
        upi_qr_code: startup.upiQrCode,
        upiQrCode: startup.upiQrCode,
        pitch: startup.pitch || '',
        funding_goal: startup.fundingGoal || '0',
        upi_id: startup.upiId,
        mediaUrls: startup.mediaUrls || [],
        videoUrl: startup.videoUrl || null
      } as MongoStartupData));
      
      setMyStartups(formattedStartups);
      
      // Convert to UI-ready format
      const uiReadyStartups = formattedStartups.map((startup: MongoStartupData) => adaptMongoStartupToUI(startup));
      setAdaptedStartups(uiReadyStartups);
      setStartupsLoading(false);
    }
  }, [mongoStartups, mongoStartupsLoading, userId]);
  
  // MongoDB transactions
  const { data: mongoTransactions, isLoading: mongoTransactionsLoading } = useQuery({
    queryKey: ['/api/transactions/founder', userId],
    queryFn: async () => {
      if (!userId) return { transactions: [] };
      try {
        const response = await apiRequest('GET', `/api/transactions/founder/${userId}`);
        const data = await response.json();
        console.log("[FounderDashboard] MongoDB transactions fetched:", data);
        return data;
      } catch (error) {
        console.error("[FounderDashboard] Error fetching transactions from MongoDB:", error);
        return { transactions: [] };
      }
    },
    enabled: !!userId,
  });

  // Processed transactions for UI
  const [formattedTransactions, setFormattedTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  
  // Update transactions state when MongoDB data is loaded
  useEffect(() => {
    if (mongoTransactions?.transactions && !mongoTransactionsLoading) {
      console.log("[FounderDashboard] Setting transactions from MongoDB:", mongoTransactions.transactions);
      
      // Format transactions for UI consistency
      const formatted = mongoTransactions.transactions.map((tx: any) => ({
        id: tx.id || 0,
        startupId: tx.startupId || 0,
        investorId: tx.investorId || 0,
        amount: tx.amount || "0",
        status: tx.status || "pending",
        paymentMethod: tx.paymentMethod || "card",
        transactionId: tx.transactionId || null,
        createdAt: tx.createdAt ? new Date(tx.createdAt) : null
      }));
      
      setFormattedTransactions(formatted);
      setTransactionsLoading(false);
    } else if (mongoTransactionsLoading) {
      setTransactionsLoading(true);
    }
  }, [mongoTransactions, mongoTransactionsLoading]);
  
  // Removed Supabase mutation

  const handleCreateStartup = async (startupData: any) => {
    setIsCreatingStartup(true);
    try {
      // Check if we have a valid user and userId
      if (authLoading) {
        console.error("Auth is still loading - please wait");
        throw new Error("Authentication is still loading. Please try again in a moment.");
      }
      
      if (!user) {
        console.error("Error: User is not authenticated");
        throw new Error("You must be logged in to create a startup");
      }
      
      if (!userId) {
        console.error("Error: User ID is required to create a startup");
        throw new Error("User ID is required to create a startup");
      }
      
      // Log the user information we're using
      console.log("Creating startup with user:", { 
        id: user.id,
        username: user.username,
        isAuthenticated: !!user
      });
      
      // Handle UPI QR Code file upload if provided
      let upiQrCodeUrl = null;
      if (startupData.upiQrCodeFile) {
        try {
          // Import the imagekit service dynamically
          const { uploadUpiQRCode } = await import('@/services/imagekit');
          upiQrCodeUrl = await uploadUpiQRCode(userId, startupData.upiQrCodeFile);
        } catch (uploadError) {
          console.error("Error uploading UPI QR code:", uploadError);
          // Continue with creation even if the upload fails
        }
      }
      
      // Create the MongoDB payload
      const mongoPayload = {
        name: startupData.name,
        description: startupData.description,
        pitch: startupData.pitch || "",
        founderId: userId.toString(), // Store as string for consistency
        investmentStage: startupData.investmentStage,
        category: startupData.category || null,
        fundingGoal: startupData.fundingGoalEth || "1",
        currentFunding: startupData.currentFunding || "0",
        logoUrl: startupData.logoUrl || null,
        websiteUrl: startupData.websiteUrl || null,
        upiId: startupData.upiId || null,
        upiQrCode: upiQrCodeUrl || startupData.upiQrCode || null,
        mediaUrls: [], // Initialize with empty array
        videoUrl: null // Initialize with null
      };
      
      console.log("Creating startup in MongoDB with data:", mongoPayload);
      
      try {
        // Create startup in MongoDB
        const result = await mongoCreateStartup(mongoPayload);
        
        if (result && result.id) {
          console.log('Startup created in MongoDB with ID:', result.id);
          
          // Format for UI consistency
          const typedStartupData: MongoStartupData = {
            id: result.id.toString(),
            name: result.name,
            description: result.description,
            category: result.category,
            investment_stage: result.investmentStage, // Add legacy format field for compatibility
            investmentStage: result.investmentStage,
            founderId: result.founderId,
            founder_id: result.founderId,
            logoUrl: result.logoUrl,
            logo_url: result.logoUrl, // Add legacy format field for compatibility
            upiQrCode: result.upiQrCode,
            upi_qr_code: result.upiQrCode, // Add legacy format field for compatibility
            pitch: result.pitch,
            funding_goal: result.fundingGoal, // Add legacy format field for compatibility
            upi_id: result.upiId // Add legacy format field for compatibility
          };
          
          // Add to local state for immediate UI update
          setMyStartups(prev => [...prev, typedStartupData]);
          
          // Also add to the UI-ready state in adapted format
          const adaptedStartup = adaptMongoStartupToUI(typedStartupData);
          setAdaptedStartups(prev => [...prev, adaptedStartup]);
          
          console.log("Added new startup to local state:", typedStartupData);
          
          // Handle document uploads if any
          if (result.id) {
            await uploadStartupDocuments(result.id, startupData);
          }
          
          // Close the dialog
          setIsCreateDialogOpen(false);
          
          // Reset loading state
          setIsCreatingStartup(false);
          
          // Show success message
          alert(`Startup ${result.name} created successfully!`);
          
          // Redirect to the startup details page using the MongoDB ID
          // Use setLocation from wouter for SPA navigation
          setLocation(`/startup/${result.id}`);
          
        } else {
          throw new Error("Failed to create startup - no ID returned");
        }
      } catch (error) {
        console.error("Error creating startup in MongoDB:", error);
        // Show a more user-friendly error using toast or alert
        if (error instanceof Error) {
          alert(`Failed to create startup: ${error.message}`);
        } else {
          alert("Failed to create startup due to an unexpected error. Please try again or contact support.");
        }
        setIsCreatingStartup(false);
      }
    } catch (error) {
      console.error("Error creating startup:", error);
      // Show a more user-friendly error
      if (error instanceof Error) {
        alert(`Failed to create startup: ${error.message}`);
      } else {
        alert("Failed to create startup due to an unexpected error. Please try again or contact support.");
      }
      setIsCreatingStartup(false);
    }
  };
  
  // Upload media files for a startup
  const uploadStartupDocuments = async (startupId: string, startupData: any) => {
    try {
      // Handle UPI QR code upload
      if (startupData.upiQrCodeFile) {
        try {
          console.log("Uploading UPI QR code for startup:", startupId);
          
          // First upload file to ImageKit
          const { uploadDocumentToImageKit } = await import('@/services/imagekit');
          const uploadResult = await uploadDocumentToImageKit(startupId, 'upi_qr_code', startupData.upiQrCodeFile);
          
          if (uploadResult && uploadResult.url) {
            console.log("UPI QR code uploaded to ImageKit:", uploadResult.url);
            
            // Update startup with QR code URL in MongoDB
            await mongoUpdateStartup(startupId, {
              upiQrCode: uploadResult.url
            });
            
            console.log("Startup updated with UPI QR code URL");
          }
          
          console.log("UPI QR code uploaded successfully");
        } catch (error) {
          console.error("Error uploading UPI QR code:", error);
        }
      }
      
      // Handle logo upload
      if (startupData.logoFile) {
        try {
          console.log("Uploading logo for startup:", startupId);
          
          // First upload file to ImageKit
          const { uploadDocumentToImageKit } = await import('@/services/imagekit');
          const uploadResult = await uploadDocumentToImageKit(startupId, 'logo', startupData.logoFile);
          
          if (uploadResult && uploadResult.url) {
            console.log("Logo uploaded to ImageKit:", uploadResult.url);
            
            // Update startup with logo URL in MongoDB
            await mongoUpdateStartup(startupId, {
              logoUrl: uploadResult.url
            });
            
            console.log("Startup updated with logo URL");
          }
          
          console.log("Logo uploaded successfully");
        } catch (error) {
          console.error("Error uploading logo:", error);
        }
      }
      
      // Handle media files upload (multiple images)
      if (startupData.mediaFiles && startupData.mediaFiles.length > 0) {
        try {
          console.log(`Uploading ${startupData.mediaFiles.length} media files for startup:`, startupId);
          
          const mediaUrls: string[] = [];
          
          // Upload each file to ImageKit
          const { uploadDocumentToImageKit } = await import('@/services/imagekit');
          
          for (let i = 0; i < startupData.mediaFiles.length; i++) {
            const file = startupData.mediaFiles[i];
            try {
              const uploadResult = await uploadDocumentToImageKit(
                startupId, 
                `media_${i + 1}`, 
                file
              );
              
              if (uploadResult && uploadResult.url) {
                console.log(`Media file ${i + 1} uploaded to ImageKit:`, uploadResult.url);
                mediaUrls.push(uploadResult.url);
              }
            } catch (error) {
              console.error(`Error uploading media file ${i + 1}:`, error);
            }
          }
          
          if (mediaUrls.length > 0) {
            // Update startup with media URLs in MongoDB
            await mongoUpdateStartup(startupId, {
              mediaUrls: mediaUrls
            });
            
            console.log("Startup updated with media URLs");
          }
          
          console.log("Media files uploaded successfully");
        } catch (error) {
          console.error("Error uploading media files:", error);
        }
      }
      
      // Handle video file upload
      if (startupData.videoFile) {
        try {
          console.log("Uploading video for startup:", startupId);
          
          // First upload file to ImageKit
          const { uploadDocumentToImageKit } = await import('@/services/imagekit');
          const uploadResult = await uploadDocumentToImageKit(startupId, 'video', startupData.videoFile);
          
          if (uploadResult && uploadResult.url) {
            console.log("Video uploaded to ImageKit:", uploadResult.url);
            
            // Update startup with video URL in MongoDB
            await mongoUpdateStartup(startupId, {
              videoUrl: uploadResult.url
            });
            
            console.log("Startup updated with video URL");
          }
          
          console.log("Video uploaded successfully");
        } catch (error) {
          console.error("Error uploading video:", error);
        }
      }
    } catch (error) {
      console.error("Error in uploadStartupDocuments:", error);
    }
  };

  // Type the API responses explicitly for MongoDB data
  interface ApiStartupResponse {
    startups: MongoStartupData[]; // Updated to use MongoDB naming
  }
  
  interface ApiTransactionResponse {
    transactions: {
      id: number;
      startupId: number;
      investorId: number;
      amount: string;
      status: string;
      paymentMethod: string;
      transactionId?: string | null;
      createdAt?: Date | null;
      [key: string]: any; // Allow for other properties
    }[];
  }
  
  // Now we're only using MongoDB data for UI components
  // Use formattedTransactions directly from MongoDB

  // Calculate metrics safely
  const totalInvestors = useMemo(() => {
    const investorIds: Record<string, boolean> = {};
    formattedTransactions.forEach(t => {
      if (t.investorId) {
        const id = String(t.investorId);
        investorIds[id] = true;
      }
    });
    return Object.keys(investorIds).length;
  }, [formattedTransactions]);
  
  const totalRevenue = useMemo(() => {
    return formattedTransactions
      .filter(t => t.status === "completed")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [formattedTransactions]);

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
                  {startupsLoading && myStartups.length === 0 ? <Skeleton className="h-8 w-16" /> : adaptedStartups.length}
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
                  {transactionsLoading ? <Skeleton className="h-8 w-16" /> : formattedTransactions.length}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="startups">My Startups</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart2 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          {isDevEnvironment && (
            <TabsTrigger value="dev-tools">Developer Tools</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="analytics">
          <h2 className="text-2xl font-bold mb-6">Funding Analytics</h2>
          <InvestmentAnalytics userId={userId.toString()} isFounderView={true} />
        </TabsContent>
        
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
                <StartupForm onSubmit={handleCreateStartup} isLoading={isCreatingStartup} />
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
          ) : adaptedStartups.length === 0 ? (
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
              {adaptedStartups.map((startup) => (
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
          ) : adaptedStartups.length === 0 ? (
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
                    {adaptedStartups.map((startup) => (
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
                    // Upload file to ImageKit first
                    const { uploadDocumentToImageKit } = await import('@/services/imagekit');
                    const uploadResult = await uploadDocumentToImageKit(startupId, documentType, file);
                    
                    if (uploadResult && uploadResult.url) {
                      // Create document record in MongoDB
                      const documentData = {
                        startupId: startupId,
                        type: documentType,
                        name: file.name,
                        fileUrl: uploadResult.url,
                        fileId: uploadResult.fileId,
                        fileName: uploadResult.name,
                        mimeType: file.type,
                        fileSize: file.size
                      };
                      
                      // Create document in MongoDB
                      await mongoCreateDocument(documentData);
                    }
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
          <TransactionList transactions={formattedTransactions} isLoading={transactionsLoading} />
        </TabsContent>
        
        {isDevEnvironment && (
          <TabsContent value="dev-tools">
            <h2 className="text-2xl font-bold mb-6">Developer Tools</h2>
            <Card>
              <CardHeader>
                <CardTitle>Wallet Management Tools</CardTitle>
                <CardDescription>These tools are only available in development environments</CardDescription>
              </CardHeader>
              <CardContent>
                <SampleWalletCleaner />
                <div className="mt-4 p-4 border-t border-gray-100">
                  <h3 className="text-lg font-medium mb-2">Note on Wallet Addresses</h3>
                  <p className="text-sm text-muted-foreground">
                    The platform now only uses real wallet addresses provided during signup. 
                    Sample wallets have been removed from the codebase but may still exist in the database.
                    Use the tool above to clean up any sample wallet data that might still be present.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default FounderDashboard;
