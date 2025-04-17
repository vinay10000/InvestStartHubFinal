import { useState } from "react";
import { useParams, Link } from "wouter";
import { useStartups } from "@/hooks/useStartups";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useDocuments } from "@/hooks/useDocuments";
import { useChat } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";
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
import MetaMaskPayment from "@/components/payments/MetaMaskPayment";
import UPIPayment from "@/components/payments/UPIPayment";

const StartupDetails = () => {
  const { id } = useParams();
  // Handle both numeric IDs (for local storage) and string IDs (for Firestore)
  const startupId = id && !isNaN(parseInt(id)) ? parseInt(id) : id;
  const { user } = useSimpleAuth();
  const { useStartup, useUpdateStartup } = useStartups();
  const { getDocumentsByStartupId } = useDocuments();
  const { createChat } = useChat();
  const { toast } = useToast();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isInvestDialogOpen, setIsInvestDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"metamask" | "upi">("metamask");

  // Only fetch if we have a valid ID
  const { data: startupData, isLoading: startupLoading } = useStartup(startupId?.toString());
  const { data: documentsData, isLoading: documentsLoading } = getDocumentsByStartupId(startupId);
  
  const updateStartupMutation = useUpdateStartup();
  const createChatMutation = createChat();

  // Log debug information about fetched data
  console.log("StartupDetails - Fetched startup data:", startupData);
  console.log("StartupDetails - Fetched documents data:", documentsData);

  // Safely extract data with null checks and type handling
  const startup = startupData;
  
  // Handle documents data with proper type safety
  const documents = documentsData && documentsData !== null && 
    typeof documentsData === 'object' && 'documents' in documentsData 
    ? documentsData.documents as any[] 
    : [];

  // Extract founderId with proper fallbacks
  const founderId = startup?.founderId;
  
  // Debug founderId and user ID
  console.log("Startup details - founderId:", founderId, "user.id:", user?.id, "user.uid:", user?.uid);
  
  // Check both user.id and user.uid against founderId for compatibility
  const isFounder = (user?.id === founderId) || (user?.uid === founderId);
  const isInvestor = user?.role === "investor";

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

  const handleStartChat = async () => {
    if (!user || !startup) return;
    
    try {
      // Convert string IDs to numbers if needed
      const startupIdNumber = typeof startup.id === 'string' ? parseInt(startup.id) : startup.id;
      
      // If we don't have a valid startup ID, show an error and return
      if (isNaN(startupIdNumber)) {
        console.error("Invalid startup ID for chat creation");
        toast({
          title: "Error creating chat",
          description: "Invalid startup ID",
          variant: "destructive",
        });
        return;
      }
      
      const founderIdNumber = founderId ? (typeof founderId === 'string' ? parseInt(founderId) : founderId) : null;
      const investorIdNumber = user.id ? (typeof user.id === 'string' ? parseInt(user.id) : user.id) : null;
      
      if (!founderIdNumber || !investorIdNumber) {
        console.error("Missing required IDs for chat creation");
        toast({
          title: "Error creating chat",
          description: "Missing user information",
          variant: "destructive",
        });
        return;
      }
      
      const chatData = {
        founderId: founderIdNumber,
        investorId: investorIdNumber,
        startupId: startupIdNumber,
      };
      
      // Show loading state or message
      toast({
        title: "Creating chat...",
        description: "Connecting you with the startup founder",
      });
      
      const result = await createChatMutation.mutateAsync(chatData);
      
      toast({
        title: "Chat created!",
        description: "You can now communicate with the startup founder",
        variant: "default",
      });
      
      // Redirect to chat
      window.location.href = `/chat/${result.chat.id}`;
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
  const investmentStage = startup.investment_stage || startup.investmentStage || 'seed'; // Fallback value
  const upiId = startup.upi_id || startup.upiId || '';
  const upiQrCode = startup.upi_qr_code || startup.upiQrCode || '';
  const fundingGoal = startup.funding_goal || startup.fundingGoal || '0';
  
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
                      startupId={startupId} 
                      onComplete={handleUploadComplete}
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}
            
            {isInvestor && (
              <>
                <Dialog open={isInvestDialogOpen} onOpenChange={setIsInvestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="font-semibold bg-green-600 hover:bg-green-700">
                      <DollarSign className="mr-2 h-5 w-5" />
                      Invest Now
                    </Button>
                  </DialogTrigger>
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
                        <MetaMaskPayment 
                          startupId={Number(startup.id)}
                          startupName={startup.name}
                          onPaymentComplete={() => setIsInvestDialogOpen(false)}
                        />
                      </TabsContent>
                      
                      <TabsContent value="upi">
                        <UPIPayment 
                          startupId={Number(startup.id)}
                          startupName={startup.name}
                          upiId={upiId || ""}
                          upiQrCode={upiQrCode || ""}
                          onPaymentComplete={() => setIsInvestDialogOpen(false)}
                        />
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" onClick={handleStartChat}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message
                </Button>
              </>
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
                    setIsInvestDialogOpen(true);
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
                    <Button className="w-full mt-4" variant="outline">
                      Invest with MetaMask
                    </Button>
                  </CardContent>
                </Card>

                {/* UPI Option */}
                <Card className="bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => {
                    setPaymentMethod("upi");
                    setIsInvestDialogOpen(true);
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
                    <Button className="w-full mt-4" variant="outline">
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
