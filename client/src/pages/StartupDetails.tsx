import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useStartups } from "@/hooks/useStartups";
import { useAuth } from "@/hooks/useAuth";
import { useDocuments } from "@/hooks/useDocuments";
import { useChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/useWeb3";
import { useStartupMedia } from "@/hooks/useStartupMedia";
import { useStartupUpdates } from "@/hooks/useStartupUpdates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getInvestmentStageColor } from "@/lib/utils";
import { MessageSquare, FileText, DollarSign, Pencil, PlusCircle, Wallet, QrCode, BarChart2, Image, Video, Bell } from "lucide-react";
import DocumentUpload from "@/components/startups/DocumentUpload";
import StartupDocumentUpload from "@/components/startups/StartupDocumentUpload";
import DocumentViewer from "@/components/startups/DocumentViewer";
import StartupForm from "@/components/startups/StartupForm";
import StartupMediaUpload from "@/components/startups/StartupMediaUpload";
import StartupMediaViewer from "@/components/startups/StartupMediaViewer";
import StartupUpdates from "@/components/startups/StartupUpdates";
import { FirebaseStartup, FirebaseDocument } from "@/firebase/database";
import { Document } from "@/services/documentService";
import ImprovedMetaMaskPayment from "@/components/payments/ImprovedMetaMaskPayment";
import SimpleMetaMaskPayment from "@/components/payments/SimpleMetaMaskPayment";
import UPIPayment from "@/components/payments/UPIPayment";
import { getUserWallet } from "@/firebase/walletDatabase";
import { getStartupWallet, isSampleWalletAddress } from "@/firebase/getStartupWallet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import InvestmentAnalytics from "@/components/dashboard/InvestmentAnalytics";

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
  const [isMediaUploadDialogOpen, setIsMediaUploadDialogOpen] = useState(false);
  const [isInvestDialogOpen, setIsInvestDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"metamask" | "upi">("metamask");
  const { connect } = useWeb3();
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);

  // Always convert the ID to string to properly handle Firebase IDs
  const safeStartupId = startupId ? startupId.toString() : "";
  console.log("[StartupDetails] Looking up startup with ID:", safeStartupId);
  
  // Only fetch if we have a valid ID
  const { data: startupData, isLoading: startupLoading } = useStartup(safeStartupId);
  const { data: documentsData, isLoading: documentsLoading } = getDocumentsByStartupId(safeStartupId);
  const { getStartupMedia } = useStartupMedia();
  const { getStartupUpdates } = useStartupUpdates();
  
  // Fetch media and updates
  const { data: mediaData, isLoading: mediaLoading } = getStartupMedia(safeStartupId);
  const { data: updatesData, isLoading: updatesLoading } = getStartupUpdates(safeStartupId);
  
  const updateStartupMutation = useUpdateStartup();
  const createChatMutation = createChat();

  // Log debug information about fetched data
  console.log("StartupDetails - ID from params:", id);
  console.log("StartupDetails - Startup ID being used for query:", startupId);
  console.log("StartupDetails - Current user:", user);
  console.log("StartupDetails - User role:", user?.role);
  console.log("StartupDetails - Fetched startup data:", startupData);
  console.log("StartupDetails - Fetched documents data:", documentsData);
  
  // Use useWeb3 hook for accurate wallet connection status
  const { address: metamaskAddress, isWalletConnected } = useWeb3();
  
  // Use the dedicated isWalletConnected method which checks all sources of truth
  const hasWalletConnectedMethod = isWalletConnected() || (user?.walletAddress && user.walletAddress !== '');
  
  // Log wallet connection status for debugging
  console.log("Wallet connection status:", { 
    userWalletAddress: user?.walletAddress,
    metamaskAddress,
    localStorageWalletConnected: localStorage.getItem('wallet_connected'),
    isWalletConnectedMethod: isWalletConnected(),
    hasWalletConnected: hasWalletConnectedMethod
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
    // Open investment dialog directly without any wallet checks
    console.log("Opening investment dialog directly without wallet checks");
    setIsInvestDialogOpen(true);
  };
  
  const handleStartChat = async () => {
    if (!user || !startup) return;
    
    try {
      // Log the initial values for debugging
      console.log("Chat redirect - Initial values:", {
        startupId: startup.id,
        startupName: startup.name,
        founderId,
        userId: user.id,
        userRole: user.role
      });
      
      // If user is an investor, directly redirect to chat with the founder
      if (user.role === 'investor' && founderId) {
        toast({
          title: "Opening chat...",
          description: `Connecting you with the founder of ${startup.name}`,
        });
        
        // For direct connection, use the founder's ID as the chat identifier
        // This ensures we always go to the same founder's chat when clicking from their startup
        setLocation(`/chat/founder/${founderId}`);
        return;
      }
      
      // Original chat creation logic for backward compatibility and other roles
      // Get startup ID - always convert to number for consistency with the API
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
            const stringToNumber = (str: string): number => {
              let hash = 0;
              for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0; // Convert to 32bit integer
              }
              return Math.abs(hash) % 10000; // Keep it under 10000
            };
            
            startupIdNumber = stringToNumber(startup.id);
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
          }
        }
      }
      
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

  // Helper function for wallet connection
  const handleWalletConnection = async () => {
    setIsSubmittingWallet(true);
    try {
      const success = await connect();
      if (success) {
        toast({
          title: "Success",
          description: "Wallet connected successfully"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to connect wallet",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Error",
        description: "Failed to connect wallet",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingWallet(false);
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

  // Update the investment dialog content
  const renderInvestmentDialog = () => (
    <Dialog open={isInvestDialogOpen} onOpenChange={setIsInvestDialogOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invest in {startup?.name}</DialogTitle>
          <DialogDescription>
            Choose your preferred payment method to invest in this startup.
          </DialogDescription>
        </DialogHeader>
        
        {(!isWalletConnected() && !user?.walletAddress) ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-slate-50 rounded-lg mb-2">
              <p className="text-center">Please connect your MetaMask wallet to invest in this startup</p>
            </div>
            <Button 
              className="w-full" 
              onClick={handleWalletConnection}
              disabled={isSubmittingWallet}
            >
              {isSubmittingWallet ? "Connecting..." : "Connect MetaMask"}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="metamask" className="w-full">
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
        )}
      </DialogContent>
    </Dialog>
  );

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
                  <DialogContent className="sm:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Startup</DialogTitle>
                      <DialogDescription>
                        Update your startup profile information
                      </DialogDescription>
                    </DialogHeader>
                    <div className="pr-1 overflow-y-auto">
                      <StartupForm 
                        onSubmit={handleEditStartup} 
                        isLoading={updateStartupMutation.isPending} 
                        defaultValues={startup}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Documents
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Upload Documents</DialogTitle>
                      <DialogDescription>
                        Upload essential documents for investors to review
                      </DialogDescription>
                    </DialogHeader>
                    <div className="pr-1 overflow-y-auto">
                      <StartupDocumentUpload 
                        startupId={startupId ? startupId.toString() : ""} 
                        onComplete={handleUploadComplete}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isMediaUploadDialogOpen} onOpenChange={setIsMediaUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Media
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Upload Media</DialogTitle>
                      <DialogDescription>
                        Upload photos and videos to showcase your startup (maximum size: 20MB per file)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="pr-1 overflow-y-auto">
                      <StartupMediaUpload 
                        startupId={startupId ? startupId.toString() : ""} 
                        onComplete={() => setIsMediaUploadDialogOpen(false)}
                      />
                    </div>
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
                {renderInvestmentDialog()}
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
        
        {/* Investment Analytics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="h-6 w-6 mr-2 text-primary" />
              {isFounder ? "Funding Analytics" : "Investment Overview"}
            </CardTitle>
            <CardDescription>
              {isFounder 
                ? "Track your startup's funding progress and investor engagement" 
                : "View investment performance and transaction history"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvestmentAnalytics 
              startupId={safeStartupId}
              userId={user?.id?.toString()}
              isFounderView={isFounder}
            />
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

        <Tabs defaultValue="documents" className="mb-8">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Media
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Updates
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents">
            <Card>
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
          </TabsContent>
          
          <TabsContent value="media">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Media Gallery
                  </CardTitle>
                  {isFounder && (
                    <Button variant="outline" size="sm" onClick={() => setIsMediaUploadDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Media
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Photos and videos showcasing the startup
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mediaLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : mediaData?.media && mediaData.media.length > 0 ? (
                  <StartupMediaViewer media={mediaData.media} isLoading={false} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <Image className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">No media available</h3>
                    <p className="text-muted-foreground text-center">
                      {isFounder 
                        ? "Upload photos and videos to showcase your startup to potential investors." 
                        : "The founder hasn't uploaded any media yet."}
                    </p>
                    {isFounder && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setIsMediaUploadDialogOpen(true)}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Upload Media
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="updates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Startup Updates
                  </CardTitle>
                </div>
                <CardDescription>
                  Latest news and progress updates from the team
                </CardDescription>
              </CardHeader>
              <CardContent>
                {updatesLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <StartupUpdates 
                    startupId={safeStartupId} 
                    isFounder={isFounder}
                    updates={updatesData?.updates || []}
                    isLoading={false}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StartupDetails;
