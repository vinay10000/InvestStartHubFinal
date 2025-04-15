import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText } from "lucide-react";
import DocumentUpload from './DocumentUpload';
import DocumentViewer from './DocumentViewer';

interface DocumentUploadSectionProps {
  startupId: string | number;
  uploadDocument: any;
  getDocumentsByStartupId: any;
}

const DocumentUploadSection = ({ 
  startupId, 
  uploadDocument, 
  getDocumentsByStartupId 
}: DocumentUploadSectionProps) => {
  const [activeView, setActiveView] = useState('upload');
  const uploadDocumentMutation = uploadDocument();
  
  // Fetch existing documents
  const { 
    data: documentsData, 
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments  
  } = getDocumentsByStartupId(startupId);
  
  const documents = documentsData?.documents || [];
  
  // Auto-refresh documents when view changes
  useEffect(() => {
    if (activeView === 'view') {
      refetchDocuments();
    }
  }, [activeView, refetchDocuments]);
  
  // Handle document upload
  const handleUploadDocument = async (data: { name: string; type: string; file: File }) => {
    try {
      await uploadDocumentMutation.mutateAsync({
        startupId,
        name: data.name,
        type: data.type,
        file: data.file
      });
      
      // Switch to view tab after successful upload
      setTimeout(() => {
        setActiveView('view');
        refetchDocuments();
      }, 1000);
    } catch (error) {
      console.error("Error uploading document:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Manage Startup Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeView} value={activeView} onValueChange={setActiveView}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="upload">Upload Documents</TabsTrigger>
            <TabsTrigger value="view">View Documents</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload">
            <DocumentUpload 
              onSubmit={handleUploadDocument} 
              isLoading={uploadDocumentMutation.isPending} 
            />
          </TabsContent>
          
          <TabsContent value="view">
            <DocumentViewer 
              documents={documents} 
              isLoading={isLoadingDocuments} 
            />
          </TabsContent>
        </Tabs>
        
        {/* Important note about document uploads */}
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            Upload essential documents to attract potential investors. Complete documentation 
            increases your startup's credibility and helps investors make informed decisions.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default DocumentUploadSection;