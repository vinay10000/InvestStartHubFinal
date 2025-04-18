import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useStartups } from "@/hooks/useStartups";
import { useAuth } from "@/hooks/useAuth";
import { useDocuments } from "@/hooks/useDocuments";
import { useChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/useWeb3";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getInvestmentStageColor } from "@/lib/utils";
import { MessageSquare, FileText, DollarSign, Pencil, PlusCircle, Wallet, QrCode } from "lucide-react";
import DocumentUpload from "@/components/startups/DocumentUpload";
import StartupDocumentUpload from "@/components/startups/StartupDocumentUpload";
import DocumentViewer from "@/components/startups/DocumentViewer";
import StartupForm from "@/components/startups/StartupForm";
import { FirebaseStartup, FirebaseDocument } from "@/firebase/database";
import { Document } from "@/services/documentService";
import ImprovedMetaMaskPayment from "@/components/payments/ImprovedMetaMaskPayment";
import UPIPayment from "@/components/payments/UPIPayment";
import { getUserWallet } from "@/firebase/walletDatabase";

// Helper function to convert any startup ID to a valid numeric ID for blockchain
function getNumericStartupId(id: any): number {
  if (id === undefined || id === null) {
    return 1; // Default fallback
  }
  
  if (typeof id === 'number') {
    return id;
  }
  
  if (typeof id === 'string') {
    // First try to parse it as a number
    const parsed = parseInt(id);
    if (!isNaN(parsed)) {
      return parsed;
    }
    
    // If it's a string that can't be parsed as a number (like a Firebase ID),
    // generate a consistent numeric hash from the string
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash % 10000) + 1; // Keep it between 1-10000
  }
  
  return 1; // Default fallback
}

const StartupDetails = () => {
  const { id } = useParams();
  // Handle string IDs for Firebase (primary storage method)
  // Note: We're prioritizing string IDs because Firebase uses string IDs
  const startupId = id ? id : null;
  const { user } = useAuth();
  const { useStartup, useUpdateStartup } = useStartups();
  const { getDocumentsByStartupId } = useDocuments();
  const { createChat } = useChat();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isInvestDialogOpen, setIsInvestDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"metamask" | "upi">("metamask");

  // Always convert the ID to string to properly handle Firebase IDs
  const safeStartupId = startupId ? startupId.toString() : "";
  console.log("[StartupDetails] Looking up startup with ID:", safeStartupId);
  
  // Only fetch if we have a valid ID
  const { data: startupData, isLoading: startupLoading } = useStartup(safeStartupId);
  const { data: documentsData, isLoading: documentsLoading } = getDocumentsByStartupId(safeStartupId);
  
  const updateStartupMutation = useUpdateStartup();
  const createChatMutation = createChat();

  // Log debug information about fetched data
  console.log("StartupDetails - ID from params:", id);
  console.log("StartupDetails - Startup ID being used for query:", startupId);
  console.log("StartupDetails - Current user:", user);
  console.log("StartupDetails - User role:", user?.role);
  console.log("StartupDetails - Fetched startup data:", startupData);
  console.log("StartupDetails - Fetched documents data:", documentsData);
  
  // Add more detailed logging for debugging
  if (startupData) {
    // Use conditional access to avoid TypeScript errors
    console.log("StartupDetails - UPI QR code URL:", 
      startupData.upi_qr_code || (startupData as any).upiQrCode || "Not available");
    console.log("StartupDetails - UPI ID:", 
      startupData.upi_id || (startupData as any).upiId || "Not available");
  }
  
  // Log document URLs if available
  if (documentsData && documentsData.documents && documentsData.documents.length > 0) {
    console.log("StartupDetails - Document URLs:", documentsData.documents.map((doc: any) => doc.fileUrl));
  }
  
  // Use useWeb3 hook for accurate wallet connection status
  const { address: metamaskAddress, isWalletConnected } = useWeb3();
  
  // Use the dedicated isWalletConnected method which checks all sources of truth
  const hasWalletConnected = isWalletConnected() || (user?.walletAddress && user.walletAddress !== '');
  
  // Log wallet connection status for debugging
  console.log("Wallet connection status:", { 
    userWalletAddress: user?.walletAddress,
    metamaskAddress,
    localStorageWalletConnected: localStorage.getItem('wallet_connected'),
    isWalletConnectedMethod: isWalletConnected(),
    hasWalletConnected 
  });

  // Safely extract data with null checks and type handling
  const startup = startupData;
  
  // Convert FirebaseDocument to Document type expected by DocumentViewer
  const convertToDocumentType = (doc: FirebaseDocument | any): Document => {
    return {
      id: doc.id || '',
      startupId: doc.startupId || '',
      type: doc.type || '',
      name: doc.name || doc.fileName || 'Untitled',
      fileUrl: doc.fileUrl || '',
      fileId: doc.fileId,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      createdAt: doc.createdAt || new Date().toISOString(),
    };
  };
  
  // Handle documents data with proper type safety
  const documents = documentsData && documentsData !== null && 
    typeof documentsData === 'object' && 'documents' in documentsData 
    ? (documentsData.documents || []).map(convertToDocumentType)
    : [];

  // Extract founderId with proper fallbacks
  const founderId = startup?.founderId;
  
  // Debug founderId and user ID
  console.log("Startup details - founderId:", founderId, "user.id:", user?.id, "user.uid:", user?.uid);
  
  // Check if the user is the founder - check multiple ID forms
  const isFounder = user?.role === "founder" && (
    // Convert both to strings for comparison to avoid type mismatch
    (founderId && user?.id && String(founderId) === String(user.id)) ||
    (founderId && user?.uid && String(founderId) === String(user.uid)) ||
    // If we don't have a founderId but the user is a founder, assume they can edit
    (user?.role === "founder" && !founderId)
  );
  
  // Only show investor UI to investors and not the founder of this startup
  // This prevents founders from seeing invest/chat buttons on their own startups
  const isInvestor = user?.role === "investor" || (user?.role === "founder" && !isFounder);
  
  // Debug user role
  console.log("User role check:", 
    "user:", user, 
    "role:", user?.role, 
    "isInvestor:", isInvestor, 
    "isFounder:", isFounder);

  const handleEditStartup = async (startupData: any) => {
    try {
      await updateStartupMutation.mutateAsync({
        id: startupId,
        ...startupData,
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating startup:", error);
    }
  };

  // Document uploading is now handled directly in the StartupDocumentUpload component
  const handleUploadComplete = () => {
    setIsUploadDialogOpen(false);
  };

  // Handle investment button click based on wallet connection status
  const handleInvestClick = () => {
    // For UPI payments, we don't need a wallet - open dialog immediately
    if (paymentMethod === "upi") {
      setIsInvestDialogOpen(true);
      return;
    }
    
    // For MetaMask payments, check if wallet is connected in any form (browser or database)
    if (paymentMethod === "metamask") {
      // Log the current state for debugging
      console.log("MetaMask payment - Current wallet state:", {
        paymentMethod,
        hasWalletConnected,
        userWalletAddress: user?.walletAddress,
        metamaskAddress,
        isWalletConnectedMethod: isWalletConnected(),
        localStorageWallet: localStorage.getItem('wallet_connected')
      });
      
      // If user has a wallet in database but not connected in browser, we can proceed
      // The ImprovedMetaMaskPayment component will handle auto-connecting
      if (user?.walletAddress) {
        console.log("User has wallet in database, proceeding to payment dialog");
        setIsInvestDialogOpen(true);
        return;
      }
      
      // If wallet is not connected at all (not in database and not in browser), redirect to connect
      if (!hasWalletConnected) {
        console.log("No wallet connected in any form, redirecting to wallet connection");
        
        // Redirect to wallet connection page with return URL
        const returnUrl = `/startup/${id}`;
        setLocation(`/wallet-connect?returnUrl=${encodeURIComponent(returnUrl)}`);
        
        // Show a toast notification
        toast({
          title: "Wallet Required",
          description: "You need to connect a wallet to invest in this startup",
          duration: 5000,
        });
        return;
      }
      
      // If we get here, we have a wallet connected in some form, open dialog
      console.log("Opening investment dialog - wallet is connected");
      setIsInvestDialogOpen(true);
    }
  };
  
  const handleStartChat = async () => {
    if (!user || !startup) return;
    
    try {
      // Log the initial values for debugging
      console.log("Chat creation - Initial values:", {
        startupId: startup.id,
        startupIdType: typeof startup.id,
        founderId,
        founderIdType: typeof founderId,
        userId: user.id,
        userIdType: typeof user.id,
        userRole: user.role
      });
      
      // Get startup ID - always convert to number for consistency with the API
      // Use a default value of 1 if we can't parse the ID (to avoid server errors)
      let startupIdNumber: number = 1;
      
      if (startup.id !== undefined && startup.id !== null) {
        if (typeof startup.id === 'number') {
          startupIdNumber = startup.id;
        } else if (typeof startup.id === 'string') {
          // First try to parse it directly
          const parsed = parseInt(startup.id);
          if (!isNaN(parsed)) {
            startupIdNumber = parsed;
          } else {
            // If it's a Firebase ID (non-numeric string), generate a numeric hash
            // Simple hash function to convert string to number
            const stringToNumber = (str: string): number => {
              let hash = 0;
              for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0; // Convert to 32bit integer
              }
              return Math.abs(hash) % 10000; // Keep it under 10000
            };
            
            startupIdNumber = stringToNumber(startup.id);
            console.log("Generated numeric ID for Firebase startup ID:", startupIdNumber);
          }
        }
      }
      
      // Get founder ID based on role
      let founderIdNumber: number = 1;
      
      if (user.role === 'founder') {
        // If current user is the founder, use their ID
        if (typeof user.id === 'number') {
          founderIdNumber = user.id;
        } else if (typeof user.id === 'string') {
          const parsed = parseInt(user.id);
          if (!isNaN(parsed)) {
            founderIdNumber = parsed;
          } else {
            // Generate a numeric ID from the string
            const stringToNumber = (str: string): number => {
              let hash = 0;
              for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
              }
              return Math.abs(hash) % 10000;
            };
            
            founderIdNumber = stringToNumber(user.id);
            console.log("Generated numeric ID for founder:", founderIdNumber);
          }
        }
      } else if (founderId !== undefined && founderId !== null) {
        // Use the provided founder ID if available
        if (typeof founderId === 'number') {
          founderIdNumber = founderId;
        } else if (typeof founderId === 'string') {
          const parsed = parseInt(founderId);
          if (!isNaN(parsed)) {
            founderIdNumber = parsed;
          } else {
            // Generate a numeric ID from the string
            const stringToNumber = (str: string): number => {
              let hash = 0;
              for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
              }
              return Math.abs(hash) % 10000;
            };
            
            founderIdNumber = stringToNumber(founderId);
            console.log("Generated numeric ID for founder string ID:", founderIdNumber);
          }
        }
      }
      
      // Get investor ID (user ID) with role-based logic
      let investorIdNumber: number = 2;
      
      if (user.role === 'investor') {
        // If current user is the investor, use their ID
        if (typeof user.id === 'number') {
          investorIdNumber = user.id;
        } else if (typeof user.id === 'string') {
          const parsed = parseInt(user.id);
          if (!isNaN(parsed)) {
            investorIdNumber = parsed;
          } else {
            // Generate a numeric ID from the string
            const stringToNumber = (str: string): number => {
              let hash = 0;
              for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
              }
              return Math.abs(hash) % 10000;
            };
            
            investorIdNumber = stringToNumber(user.id);
            console.log("Generated numeric ID for investor:", investorIdNumber);
          }
        }
      } else if (user.id !== undefined && user.id !== null) {
        // For consistency, if we're not an investor but need an investor ID
        if (typeof user.id === 'number') {
          investorIdNumber = user.id;
        } else if (typeof user.id === 'string') {
          const parsed = parseInt(user.id);
          if (!isNaN(parsed)) {
            investorIdNumber = parsed;
          } else {
            // Use default investor ID
            console.log("Using default investor ID (2) as we couldn't parse:", user.id);
          }
        }
      }
      
      // Log the values we're going to use
      console.log("Chat creation - Using values:", {
        startupIdNumber,
        founderIdNumber,
        investorIdNumber
      });
      
      // Create final chat data with correct types
      const chatData = {
        founderId: founderIdNumber,
        investorId: investorIdNumber,
        startupId: startupIdNumber,
      };
      
      // Show loading state or message
      toast({
        title: "Creating chat...",
        description: "Connecting you with the " + (user.role === 'founder' ? "investor" : "startup founder"),
      });
      
      // Create the chat using the mutation 
      const result = await createChatMutation.mutateAsync(chatData);
      
      // Get the chat ID and Firebase ID if available
      const chatId = result.chat.id;
      const firebaseId = result.chat.firebaseId;
      
      console.log("Chat created successfully:", {
        chatId,
        firebaseId,
        result
      });
      
      toast({
        title: "Chat created!",
        description: "You can now communicate with the " + (user.role === 'founder' ? "investor" : "startup founder"),
        variant: "default",
      });
      
      // Use the Firebase ID if available (for realtime features), otherwise use the local ID
      const redirectId = firebaseId || chatId;
      
      // Redirect to chat using wouter navigation instead of window.location
      setLocation(`/chat/${redirectId}`);
    } catch (error) {
      console.error("Error creating chat:", error);
      
      toast({
        title: "Error creating chat",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  if (startupLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-4" />
          <Skeleton className="h-6 w-1/4 mb-8" />
          <Skeleton className="h-96 w-full rounded-lg mb-8" />
        </div>
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Startup Not Found</h1>
        <p className="text-gray-600 mb-8">The startup you're looking for doesn't exist or has been removed.</p>
        <Link href="/startups">
          <Button>Browse All Startups</Button>
        </Link>
      </div>
    );
  }

  // Extract properties with fallbacks for type safety
  const name = startup.name || '';
  const description = startup.description || '';
  const pitch = startup.pitch || '';
  const investmentStage = startup.investment_stage || 'seed'; // Fallback value
  const upiId = startup.upi_id || '';
  const upiQrCode = startup.upi_qr_code || '';
  const fundingGoal = startup.funding_goal || '0';
  
  const { bg: stageBg, text: stageText } = getInvestmentStageColor(investmentStage);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{name}</h1>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${stageBg} ${stageText}`}>{investmentStage}</Badge>
              <Badge variant="outline" className="font-semibold">
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                Funding Goal: {fundingGoal || "0"} {fundingGoal ? (typeof fundingGoal === 'string' && fundingGoal.includes('ETH') ? 'ETH' : '') : ''}
              </Badge>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-4 md:mt-0">
            {isFounder && (
              <>
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Edit Startup</DialogTitle>
                      <DialogDescription>
                        Update your startup profile information
                      </DialogDescription>
                    </DialogHeader>
                    <StartupForm 
                      onSubmit={handleEditStartup} 
                      isLoading={updateStartupMutation.isPending} 
                      defaultValues={startup}
                    />
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Documents
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                      <DialogTitle>Upload Documents</DialogTitle>
                      <DialogDescription>
                        Upload essential documents for investors to review
                      </DialogDescription>
                    </DialogHeader>
                    <StartupDocumentUpload 
                      startupId={startupId ? startupId.toString() : ""} 
                      onComplete={handleUploadComplete}
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}
            
            {isInvestor && (
              <div className="flex flex-wrap gap-2">
                {/* Invest Button */}
                <Button 
                  size="lg" 
                  className="font-semibold bg-green-600 hover:bg-green-700"
                  onClick={handleInvestClick}
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  Invest
                </Button>
                
                {/* Chat Button */}
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={handleStartChat}
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Chat
                </Button>
                
                {/* Investment Dialog */}
                <Dialog open={isInvestDialogOpen} onOpenChange={setIsInvestDialogOpen}>
                  <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                      <DialogTitle>Invest in {name}</DialogTitle>
                      <DialogDescription>
                        Choose your preferred payment method
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "metamask" | "upi")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="metamask">MetaMask</TabsTrigger>
                        <TabsTrigger value="upi">UPI</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="metamask">
                        <ImprovedMetaMaskPayment 
                          startupId={getNumericStartupId(startup.id)}
                          startupName={startup.name}
                          onPaymentComplete={() => setIsInvestDialogOpen(false)}
                        />
                      </TabsContent>
                      
                      <TabsContent value="upi">
                        <UPIPayment 
                          startupId={Number(startup.id).toString()}
                          startupName={startup.name}
                          upiId={upiId || ""}
                          upiQrCode={upiQrCode || ""}
                          onPaymentComplete={() => setIsInvestDialogOpen(false)}
                        />
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-2">About the Startup</h2>
            <p className="text-gray-700 mb-4">{description}</p>
            
            <h2 className="text-xl font-bold mb-2">Pitch</h2>
            <p className="text-gray-700">{pitch}</p>
          </CardContent>
        </Card>

        {isInvestor && (
          <Card className="mb-8 border-2 border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-6 w-6 mr-2 text-green-600" />
                Investment Options
              </CardTitle>
              <CardDescription>
                Choose your preferred payment method to invest in {name}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* MetaMask Option */}
                <Card className="bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" 
                  onClick={() => {
                    setPaymentMethod("metamask");
                    handleInvestClick();
                  }}>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg flex items-center">
                      <Wallet className="h-5 w-5 mr-2" />
                      Pay with MetaMask
                    </CardTitle>
                    <CardDescription>
                      Use cryptocurrency for your investment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Direct blockchain payments</li>
                      <li>• Secure Ethereum transactions</li>
                      <li>• Transparent on-chain verification</li>
                    </ul>
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={() => {
                        setPaymentMethod("metamask");
                        handleInvestClick();
                      }}
                    >
                      Invest with MetaMask
                    </Button>
                  </CardContent>
                </Card>

                {/* UPI Option */}
                <Card className="bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => {
                    setPaymentMethod("upi");
                    handleInvestClick();
                  }}>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg flex items-center">
                      <QrCode className="h-5 w-5 mr-2" />
                      Pay with UPI
                    </CardTitle>
                    <CardDescription>
                      Use Indian UPI payment system
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Scan QR code to pay</li>
                      <li>• Fast fiat currency transfers</li>
                      <li>• Submit transaction reference for verification</li>
                    </ul>
                    <Button 
                      className="w-full mt-4" 
                      variant="outline" 
                      onClick={() => {
                        setPaymentMethod("upi");
                        handleInvestClick();
                      }}
                    >
                      Invest with UPI
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              {isFounder && (
                <Button variant="outline" size="sm" onClick={() => setIsUploadDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Documents
                </Button>
              )}
            </div>
            <CardDescription>
              Essential documents for investor due diligence
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documentsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No documents available</h3>
                <p className="text-muted-foreground text-center">
                  {isFounder 
                    ? "Upload key documents like pitch deck and financial reports to share with potential investors." 
                    : "The founder hasn't uploaded any documents yet."}
                </p>
                {isFounder && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Upload Documents
                  </Button>
                )}
              </div>
            ) : (
              <DocumentViewer documents={documents} isLoading={false} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StartupDetails;
