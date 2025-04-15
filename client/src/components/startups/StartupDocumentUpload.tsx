import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileText, BarChart2, FileCheck, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import DocumentUpload from './DocumentUpload';
import useDocuments from '@/hooks/useDocuments';

type DocumentType = 'pitch_deck' | 'financial_report' | 'investor_agreement' | 'risk_disclosure';

interface StartupDocumentUploadProps {
  startupId: number | string;
  onComplete?: () => void;
}

export default function StartupDocumentUpload({ startupId, onComplete }: StartupDocumentUploadProps) {
  const [activeTab, setActiveTab] = useState<DocumentType>('pitch_deck');
  const { toast } = useToast();
  const { useUploadDocument, useStartupDocuments } = useDocuments();
  const uploadMutation = useUploadDocument();
  const { data: existingDocuments, isLoading } = useStartupDocuments(startupId);

  // Check which documents already exist for this startup
  const documentExists = (type: DocumentType): boolean => {
    if (isLoading || !existingDocuments) return false;
    return existingDocuments.some(doc => doc.type === type);
  };
  
  const getPendingDocuments = (): DocumentType[] => {
    const allTypes: DocumentType[] = ['pitch_deck', 'financial_report', 'investor_agreement'];
    return allTypes.filter(type => !documentExists(type));
  };

  // Handle file upload for a specific document type
  const handleUpload = async (file: File, documentType: DocumentType) => {
    try {
      await uploadMutation.mutateAsync({
        file,
        documentType,
        startupId
      });
      
      toast({
        title: "Document uploaded",
        description: `Your ${getDocumentTypeLabel(documentType)} has been uploaded successfully.`
      });
      
      // Move to the next tab after successful upload
      const pendingDocs = getPendingDocuments();
      if (pendingDocs.length > 0 && pendingDocs[0] !== documentType) {
        // Find the next document type that needs to be uploaded
        const currentIndex = pendingDocs.indexOf(documentType);
        if (currentIndex >= 0 && currentIndex < pendingDocs.length - 1) {
          setActiveTab(pendingDocs[currentIndex + 1]);
        }
      } else if (pendingDocs.length === 1 && pendingDocs[0] === documentType) {
        // This was the last document to upload
        toast({
          title: "All documents uploaded",
          description: "You've successfully uploaded all required documents!"
        });
        
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getDocumentTypeLabel = (type: DocumentType): string => {
    const labels: Record<DocumentType, string> = {
      'pitch_deck': 'Pitch Deck',
      'financial_report': 'Financial Report',
      'investor_agreement': 'Investor Agreement',
      'risk_disclosure': 'Risk Disclosure'
    };
    return labels[type];
  };

  const getDocumentAcceptedTypes = (type: DocumentType): string[] => {
    switch(type) {
      case 'pitch_deck':
        return ['.pdf', '.ppt', '.pptx'];
      case 'financial_report':
        return ['.pdf', '.xls', '.xlsx', '.csv'];
      case 'investor_agreement':
        return ['.pdf', '.doc', '.docx'];
      default:
        return ['.pdf', '.doc', '.docx'];
    }
  };

  const getDocumentDescription = (type: DocumentType): string => {
    switch(type) {
      case 'pitch_deck':
        return "Your pitch deck should include your vision, market opportunity, business model, team information, and growth strategy.";
      case 'financial_report':
        return "Upload your financial projections, current revenue/expenses, and funding requirements to help investors understand your financial position.";
      case 'investor_agreement':
        return "Provide a template of your investor agreement outlining the terms and conditions for potential investors.";
      default:
        return "";
    }
  };

  const allUploaded = getPendingDocuments().length === 0;

  if (allUploaded) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>All documents uploaded</AlertTitle>
        <AlertDescription>
          You have already uploaded all required documents. Investors can now view these documents on your startup profile.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Required Documents</CardTitle>
        <CardDescription>
          Provide essential documents for potential investors to review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="pitch_deck" 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as DocumentType)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger 
              value="pitch_deck" 
              className="flex items-center"
              disabled={documentExists('pitch_deck')}
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Pitch Deck</span>
              <span className="sm:hidden">Pitch</span>
              {documentExists('pitch_deck') && " ✓"}
            </TabsTrigger>
            <TabsTrigger 
              value="financial_report" 
              className="flex items-center"
              disabled={documentExists('financial_report')}
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Financial Report</span>
              <span className="sm:hidden">Financial</span>
              {documentExists('financial_report') && " ✓"}
            </TabsTrigger>
            <TabsTrigger 
              value="investor_agreement" 
              className="flex items-center"
              disabled={documentExists('investor_agreement')}
            >
              <FileCheck className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Investor Agreement</span>
              <span className="sm:hidden">Agreement</span>
              {documentExists('investor_agreement') && " ✓"}
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="pitch_deck">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  {getDocumentDescription('pitch_deck')}
                </p>
                {!documentExists('pitch_deck') && (
                  <DocumentUpload 
                    onUpload={(file) => handleUpload(file, 'pitch_deck')}
                    documentType="pitch_deck"
                    acceptedTypes={getDocumentAcceptedTypes('pitch_deck')}
                  />
                )}
                {documentExists('pitch_deck') && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Document already uploaded</AlertTitle>
                    <AlertDescription>
                      You have already uploaded a Pitch Deck for this startup.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="financial_report">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  {getDocumentDescription('financial_report')}
                </p>
                {!documentExists('financial_report') && (
                  <DocumentUpload 
                    onUpload={(file) => handleUpload(file, 'financial_report')}
                    documentType="financial_report"
                    acceptedTypes={getDocumentAcceptedTypes('financial_report')}
                  />
                )}
                {documentExists('financial_report') && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Document already uploaded</AlertTitle>
                    <AlertDescription>
                      You have already uploaded a Financial Report for this startup.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="investor_agreement">
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  {getDocumentDescription('investor_agreement')}
                </p>
                {!documentExists('investor_agreement') && (
                  <DocumentUpload 
                    onUpload={(file) => handleUpload(file, 'investor_agreement')}
                    documentType="investor_agreement"
                    acceptedTypes={getDocumentAcceptedTypes('investor_agreement')}
                  />
                )}
                {documentExists('investor_agreement') && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Document already uploaded</AlertTitle>
                    <AlertDescription>
                      You have already uploaded an Investor Agreement for this startup.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}