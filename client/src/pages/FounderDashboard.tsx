import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
import TransactionList from "@/components/transactions/TransactionList";
import { Startup } from "@shared/schema";
import { getDatabase, ref, get, child } from "firebase/database";
import { 
  createStartup as firebaseCreateStartup, 
  getStartupsByFounderId as firebaseGetStartupsByFounderId,
  createDocument as firebaseCreateDocument,
  getTransactionsByFounderId as firebaseGetTransactionsByFounderId,
  FirebaseStartup as ImportedFirebaseStartup
} from "@/firebase/database";

const FounderDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Make sure we wait for auth to complete before accessing user data
  // Extract user ID more safely, prioritizing Firebase UID
  const userId = user ? (user.uid || user.id || "") : "";
  
  // Debug auth state to diagnose issues
  useEffect(() => {
    console.log("Current auth state:", { 
      user, 
      userId, 
      authLoading, 
      hasUID: user?.uid ? "yes" : "no",
      hasID: user?.id ? "yes" : "no", 
      userDetails: user ? JSON.stringify(user) : "null" 
    });
  }, [user, userId, authLoading]);
  
  // No longer using hooks that depend on Supabase
  // We'll use Firebase functions directly
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("startups");
  const [selectedStartupId, setSelectedStartupId] = useState<string | number | null>(null);
  // Define types for Firebase data
  interface FirebaseStartup {
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
  
  const [myStartups, setMyStartups] = useState<FirebaseStartup[]>([]); // Store startups in state
  const [adaptedStartups, setAdaptedStartups] = useState<Startup[]>([]); // Converted startups for UI components

  // No longer using Supabase hooks for startups
  const [startupsLoading, setStartupsLoading] = useState(true);
  const [isCreatingStartup, setIsCreatingStartup] = useState(false);
  
  // Convert Firebase startups to the format expected by StartupCard
  const adaptFirebaseStartupToUI = (firebaseStartup: FirebaseStartup): Startup => {
    // Store both the original Firebase ID and a numeric ID for different use cases
    const originalId = typeof firebaseStartup.id === 'string' ? firebaseStartup.id : '0';
    
    // CRITICAL: We use the original Firebase ID (like -OO3QgOok6sXzmTM5_aR) instead of 
    // converting to a number. This ensures consistency with database IDs.
    return {
      id: originalId, // Keep the original Firebase ID for lookups
      name: firebaseStartup.name,
      description: firebaseStartup.description,
      category: firebaseStartup.category || null,
      investmentStage: firebaseStartup.investment_stage || "",
      founderId: parseInt(String(firebaseStartup.founderId)) || 0,
      createdAt: firebaseStartup.createdAt ? new Date(firebaseStartup.createdAt) : new Date(),
      logoUrl: firebaseStartup.logo_url || null,
      upiQrCode: firebaseStartup.upi_qr_code || null,
      pitch: firebaseStartup.pitch || "",
      fundingGoal: firebaseStartup.funding_goal || "0",
      currentFunding: firebaseStartup.current_funding || "0",
      websiteUrl: firebaseStartup.website_url || null,
      upiId: firebaseStartup.upi_id || null,
      // Add required fields that might be missing
      mediaUrls: firebaseStartup.mediaUrls || [],
      videoUrl: firebaseStartup.videoUrl || null
    };
  };
  
  // Load startups from Firebase Realtime Database
  useEffect(() => {
    const fetchStartups = async () => {
      if (userId) {
        try {
          console.log("[FounderDashboard] Fetching startups for userId:", userId);
          
          // Try to get all possible user identifiers to maximize chances of finding startups
          const possibleUserIds = new Set<string>();
          
          // Always try the primary userId
          possibleUserIds.add(userId.toString());
          
          // If user.uid exists and is different, add it too
          if (user?.uid && user.uid !== userId.toString()) {
            possibleUserIds.add(user.uid);
          }
          
          // If user.id exists and is different from both, add it as well
          if (user?.id && typeof user.id === 'string' && 
              user.id !== userId.toString() && user.id !== user?.uid) {
            possibleUserIds.add(user.id);
          }
          
          console.log("[FounderDashboard] Will try these user IDs:", Array.from(possibleUserIds));
          
          // Create an array to hold all found startups
          let allStartups: FirebaseStartup[] = [];
          const existingIds = new Set<string>(); // Track IDs to avoid duplicates
          
          // Try each user ID in sequence
          const userIdArray = Array.from(possibleUserIds);
          console.log("[FounderDashboard] Trying IDs:", userIdArray);
          for (const id of userIdArray) {
            console.log(`[FounderDashboard] Trying to fetch startups with user ID: ${id}`);
            
            // TEMPORARY LOGGING HACK - SHOW ALL STARTUPS
            const allStartupsInDB = await fetch('/api/startups')
              .then(res => res.json())
              .catch(err => {
                console.error("[FounderDashboard] Error fetching all startups:", err);
                return [];
              });
            
            console.log("[FounderDashboard] ALL STARTUPS IN DATABASE:", allStartupsInDB);
            
            // First log the user's Firebase auth info
            console.log("[FounderDashboard] Current Firebase auth user:", user);
            
            // IMPORTANT: We've removed the direct database access code, as Firebase functions 
            // should be sufficient. Just using the provided getStartupsByFounderId function.
            
            const foundStartups = await firebaseGetStartupsByFounderId(id);
            
            if (foundStartups && foundStartups.length > 0) {
              console.log(`[FounderDashboard] Found ${foundStartups.length} startups with ID ${id}:`, foundStartups);
              
              // Add only unique startups based on ID
              foundStartups.forEach(startup => {
                if (startup.id && !existingIds.has(startup.id)) {
                  existingIds.add(startup.id);
                  allStartups.push(startup);
                }
              });
            } else {
              console.log(`[FounderDashboard] No startups found with ID ${id}`);
            }
          }
          
          console.log("[FounderDashboard] Total startups found:", allStartups.length, allStartups);
          
          if (allStartups.length > 0) {
            // Format startups for UI consistency
            const formattedStartups = allStartups.map(startup => ({
              id: startup.id || '',
              name: startup.name || 'Unnamed Startup',
              description: startup.description || '',
              category: startup.category,
              investment_stage: startup.investment_stage,
              investmentStage: startup.investment_stage || 'Seed',
              founder_id: startup.founderId || userId.toString(),
              founderId: startup.founderId || userId.toString(),
              logo_url: startup.logo_url,
              logoUrl: startup.logo_url,
              upi_qr_code: startup.upi_qr_code,
              upiQrCode: startup.upi_qr_code,
              pitch: startup.pitch || '',
              funding_goal: startup.funding_goal || '0',
              upi_id: startup.upi_id,
              // Make sure we have all required fields
              mediaUrls: startup.mediaUrls || [],  // Add missing field
              videoUrl: startup.videoUrl || null   // Add missing field
            } as FirebaseStartup));
            
            setMyStartups(formattedStartups);
            
            // Convert to UI-ready format
            const uiReadyStartups = formattedStartups.map(startup => adaptFirebaseStartupToUI(startup));
            setAdaptedStartups(uiReadyStartups);
            console.log("[FounderDashboard] Set adapted startups:", uiReadyStartups);
          } else {
            console.log("[FounderDashboard] No startups found for this user in Firebase");
          }
          
          // Always update loading state when done
          setStartupsLoading(false);
        } catch (error) {
          console.error("[FounderDashboard] Error fetching startups from Firebase:", error);
          setStartupsLoading(false);
        }
      } else {
        // No userId, set loading to false
        console.log("[FounderDashboard] No userId available, cannot fetch startups");
        setStartupsLoading(false);
      }
    };
    
    if (userId) {
      fetchStartups();
    } else {
      setStartupsLoading(false);
    }
  }, [userId, user]);
  
  // Firebase transactions
  const [firebaseTransactions, setFirebaseTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  
  // Load transactions from Firebase Realtime Database
  useEffect(() => {
    const fetchTransactions = async () => {
      if (userId) {
        try {
          setTransactionsLoading(true);
          // Get transactions from Firebase
          const transactions = await firebaseGetTransactionsByFounderId(userId.toString());
          console.log("Fetched founder transactions from Firebase:", transactions);
          
          if (transactions && transactions.length > 0) {
            // Convert Firebase timestamps to Date objects if needed
            const formattedTransactions = transactions.map(tx => ({
              id: Number(tx.id) || 0,
              startupId: Number(tx.startupId) || 0,
              investorId: Number(tx.investorId) || 0,
              amount: tx.amount,
              status: tx.status,
              paymentMethod: tx.paymentMethod,
              transactionId: tx.transactionId,
              createdAt: tx.createdAt ? new Date(tx.createdAt) : null
            }));
            
            setFirebaseTransactions(formattedTransactions);
          }
        } catch (error) {
          console.error("Error fetching transactions from Firebase:", error);
        } finally {
          setTransactionsLoading(false);
        }
      }
    };
    
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);
  
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
        uid: user.uid,
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
      
      // Create the Firebase payload
      const firebasePayload = {
        name: startupData.name,
        description: startupData.description,
        pitch: startupData.pitch || "",
        founderId: userId.toString(), // Store as string for consistency
        investment_stage: startupData.investmentStage,
        category: startupData.category || null,
        funding_goal: startupData.fundingGoalEth || "1",
        funding_goal_eth: startupData.fundingGoalEth || "1",
        current_funding: startupData.currentFunding || "0",
        logo_url: startupData.logoUrl || null,
        website_url: startupData.websiteUrl || null,
        upi_id: startupData.upiId || null,
        upi_qr_code: upiQrCodeUrl || startupData.upiQrCode || null
      };
      
      console.log("Creating startup in Firebase with data:", firebasePayload);
      
      try {
        // Create startup in Firebase Realtime Database
        const result = await firebaseCreateStartup(firebasePayload);
        
        if (result && result.id) {
          console.log('Startup created in Firebase with ID:', result.id);
          
          // Format for UI consistency
          const typedStartupData: FirebaseStartup = {
            id: result.id,
            name: result.name,
            description: result.description,
            category: result.category,
            investment_stage: result.investment_stage,
            investmentStage: result.investment_stage,
            founderId: result.founderId,
            founder_id: result.founderId,
            logoUrl: result.logo_url,
            logo_url: result.logo_url,
            upiQrCode: result.upi_qr_code,
            upi_qr_code: result.upi_qr_code,
            pitch: result.pitch,
            funding_goal: result.funding_goal,
            upi_id: result.upi_id
          };
          
          // Add to local state for immediate UI update
          setMyStartups(prev => [...prev, typedStartupData]);
          
          // Also add to the UI-ready state in adapted format
          const adaptedStartup = adaptFirebaseStartupToUI(typedStartupData);
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
          
          // Redirect to the startup details page using the Firebase ID
          // Use setLocation from wouter for SPA navigation
          setLocation(`/startup/${result.id}`);
          
        } else {
          throw new Error("Failed to create startup - no ID returned");
        }
      } catch (error) {
        console.error("Error creating startup in Firebase:", error);
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
  
  // Upload documents for a startup
  const uploadStartupDocuments = async (startupId: string, startupData: any) => {
    try {
      // Handle pitch deck upload
      if (startupData.pitchDeckFile) {
        try {
          console.log("Uploading pitch deck for startup:", startupId);
          
          // First upload file to ImageKit
          const { uploadDocumentToImageKit } = await import('@/services/imagekit');
          const uploadResult = await uploadDocumentToImageKit(startupId, 'pitch_deck', startupData.pitchDeckFile);
          
          if (uploadResult && uploadResult.url) {
            console.log("Pitch deck uploaded to ImageKit:", uploadResult.url);
            
            // Create document record in Firebase
            const documentData = {
              startupId: startupId,
              type: 'pitch_deck',
              name: startupData.pitchDeckFile.name,
              fileUrl: uploadResult.url,
              fileId: uploadResult.fileId,
              fileName: uploadResult.name,
              mimeType: startupData.pitchDeckFile.type,
              fileSize: startupData.pitchDeckFile.size
            };
            
            // Create document in Firebase
            await firebaseCreateDocument(documentData);
            console.log("Pitch deck document record created in Firebase");
          }
          
          console.log("Pitch deck uploaded successfully");
        } catch (error) {
          console.error("Error uploading pitch deck:", error);
        }
      }
      
      // Handle financial report upload
      if (startupData.financialReportFile) {
        try {
          console.log("Uploading financial report for startup:", startupId);
          
          // First upload file to ImageKit
          const { uploadDocumentToImageKit } = await import('@/services/imagekit');
          const uploadResult = await uploadDocumentToImageKit(startupId, 'financial_report', startupData.financialReportFile);
          
          if (uploadResult && uploadResult.url) {
            console.log("Financial report uploaded to ImageKit:", uploadResult.url);
            
            // Create document record in Firebase
            const documentData = {
              startupId: startupId,
              type: 'financial_report',
              name: startupData.financialReportFile.name,
              fileUrl: uploadResult.url,
              fileId: uploadResult.fileId,
              fileName: uploadResult.name,
              mimeType: startupData.financialReportFile.type,
              fileSize: startupData.financialReportFile.size
            };
            
            // Create document in Firebase
            await firebaseCreateDocument(documentData);
            console.log("Financial report document record created in Firebase");
          }
          
          console.log("Financial report uploaded successfully");
        } catch (error) {
          console.error("Error uploading financial report:", error);
        }
      }
      
      // Handle investor agreement upload
      if (startupData.investorAgreementFile) {
        try {
          console.log("Uploading investor agreement for startup:", startupId);
          
          // First upload file to ImageKit
          const { uploadDocumentToImageKit } = await import('@/services/imagekit');
          const uploadResult = await uploadDocumentToImageKit(startupId, 'investor_agreement', startupData.investorAgreementFile);
          
          if (uploadResult && uploadResult.url) {
            console.log("Investor agreement uploaded to ImageKit:", uploadResult.url);
            
            // Create document record in Firebase
            const documentData = {
              startupId: startupId,
              type: 'investor_agreement',
              name: startupData.investorAgreementFile.name,
              fileUrl: uploadResult.url,
              fileId: uploadResult.fileId,
              fileName: uploadResult.name,
              mimeType: startupData.investorAgreementFile.type,
              fileSize: startupData.investorAgreementFile.size
            };
            
            // Create document in Firebase
            await firebaseCreateDocument(documentData);
            console.log("Investor agreement document record created in Firebase");
          }
          
          console.log("Investor agreement uploaded successfully");
        } catch (error) {
          console.error("Error uploading investor agreement:", error);
        }
      }
    } catch (error) {
      console.error("Error uploading startup documents:", error);
    }
  };

  // Combine startups from both sources (Firebase and API)
  // Type the API responses explicitly
  interface ApiStartupResponse {
    startups: FirebaseStartup[];
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
  
  // No longer need to transform API startups as we're using Firebase directly
    
  // Now we're only using adapted Firebase data for UI components
  const transactions = firebaseTransactions;

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
                      // Create document record in Firebase
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
                      
                      // Create document in Firebase
                      await firebaseCreateDocument(documentData);
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
          <TransactionList transactions={transactions} isLoading={transactionsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FounderDashboard;
