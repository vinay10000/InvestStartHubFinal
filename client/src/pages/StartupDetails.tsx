import { useState } from "react";
import { useParams, Link } from "wouter";
import { useStartups } from "@/hooks/useStartups";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useChat } from "@/hooks/useChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getInvestmentStageColor } from "@/lib/utils";
import { MessageSquare, FileText, DollarSign, Pencil, PlusCircle } from "lucide-react";
import DocumentUpload from "@/components/startups/DocumentUpload";
import StartupForm from "@/components/startups/StartupForm";
import MetaMaskPayment from "@/components/payments/MetaMaskPayment";
import UPIPayment from "@/components/payments/UPIPayment";

const StartupDetails = () => {
  const { id } = useParams();
  // Handle both numeric IDs (for local storage) and string IDs (for Firestore)
  const startupId = id && !isNaN(parseInt(id)) ? parseInt(id) : id;
  const { user } = useSimpleAuth();
  const { getStartupById, getDocumentsByStartupId, updateStartup, uploadDocument } = useStartups();
  const { createChat } = useChat();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isInvestDialogOpen, setIsInvestDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"metamask" | "upi">("metamask");

  // Only fetch if we have a valid ID
  const { data: startupData, isLoading: startupLoading } = getStartupById(startupId);
  const { data: documentsData, isLoading: documentsLoading } = getDocumentsByStartupId(startupId);
  
  const updateStartupMutation = updateStartup();
  const uploadDocumentMutation = uploadDocument();
  const createChatMutation = createChat();

  // Safely extract data with null checks and type handling
  const startup = startupData?.startup;
  
  // Handle documents data with proper type safety
  const documents = documentsData && documentsData !== null && 
    typeof documentsData === 'object' && 'documents' in documentsData 
    ? documentsData.documents as any[] 
    : [];

  const isFounder = user?.id === startup?.founderId;
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

  const handleUploadDocument = async (documentData: any) => {
    try {
      await uploadDocumentMutation.mutateAsync({
        startupId,
        ...documentData,
      });
      setIsUploadDialogOpen(false);
    } catch (error) {
      console.error("Error uploading document:", error);
    }
  };

  const handleStartChat = async () => {
    if (!user || !startup) return;
    
    try {
      const chatData = {
        founderId: startup.founderId,
        investorId: user.id,
        startupId: startup.id,
      };
      
      const result = await createChatMutation.mutateAsync(chatData);
      
      // Redirect to chat
      window.location.href = `/chat/${result.chat.id}`;
    } catch (error) {
      console.error("Error creating chat:", error);
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

  const { name, description, pitch, investmentStage, upiId, upiQrCode } = startup;
  const { bg: stageBg, text: stageText } = getInvestmentStageColor(investmentStage);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{name}</h1>
            <div className="flex items-center mb-2">
              <Badge className={`${stageBg} ${stageText}`}>{investmentStage}</Badge>
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
                      Add Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Document</DialogTitle>
                      <DialogDescription>
                        Upload a document for investors to review
                      </DialogDescription>
                    </DialogHeader>
                    <DocumentUpload 
                      onSubmit={handleUploadDocument} 
                      isLoading={uploadDocumentMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </>
            )}
            
            {isInvestor && (
              <>
                <Dialog open={isInvestDialogOpen} onOpenChange={setIsInvestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Invest
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
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
                          startupId={startup.id}
                          startupName={startup.name}
                          onPaymentComplete={() => setIsInvestDialogOpen(false)}
                        />
                      </TabsContent>
                      
                      <TabsContent value="upi">
                        <UPIPayment 
                          startupId={startup.id}
                          startupName={startup.name}
                          upiId={startup.upiId || ""}
                          upiQrCode={startup.upiQrCode || ""}
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

        <h2 className="text-2xl font-bold mb-4">Documents</h2>
        {documentsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No documents yet</h3>
              {isFounder && (
                <p className="text-muted-foreground text-center mb-4">Upload documents to share with potential investors</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {documents.map((document: any) => (
              <Card key={document.id} className="overflow-hidden">
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">{document.name}</CardTitle>
                  <CardDescription>
                    {document.type === "pitch_deck" && "Pitch Deck"}
                    {document.type === "financial_report" && "Financial Report"}
                    {document.type === "investor_agreement" && "Investor Agreement / Terms Sheet"}
                    {document.type === "risk_disclosure" && "Risk Disclosure"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex flex-col space-y-2">
                    <a 
                      href={document.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:text-primary-600"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Document
                    </a>
                    <a 
                      href={document.fileUrl} 
                      download={document.name}
                      className="inline-flex items-center text-primary hover:text-primary-600"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="mr-2 h-4 w-4"
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StartupDetails;
