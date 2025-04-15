import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, BarChart2, FileCheck, Download, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

type DocumentType = 'pitch_deck' | 'financial_report' | 'investor_agreement' | 'risk_disclosure' | 'all';

interface Document {
  id: string;
  name: string;
  type: DocumentType;
  fileUrl: string;
  file_id?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  createdAt: string;
}

interface DocumentViewerProps {
  documents: Document[];
  startupName: string;
}

// Document type icons
const documentIcons: Record<DocumentType, React.ReactNode> = {
  'pitch_deck': <FileText className="w-5 h-5" />,
  'financial_report': <BarChart2 className="w-5 h-5" />,
  'investor_agreement': <FileCheck className="w-5 h-5" />,
  'risk_disclosure': <FileText className="w-5 h-5" />,
  'all': <FileText className="w-5 h-5" />
};

// Human-readable document type labels
const documentTypeLabels: Record<DocumentType, string> = {
  'pitch_deck': 'Pitch Deck',
  'financial_report': 'Financial Report',
  'investor_agreement': 'Investor Agreement',
  'risk_disclosure': 'Risk Disclosure',
  'all': 'All Documents'
};

export default function DocumentViewer({ documents, startupName }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<DocumentType>('all');

  // Filter documents by type
  const filteredDocuments = activeTab === 'all' 
    ? documents 
    : documents.filter(doc => doc.type === activeTab);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format file size
  const formatFileSize = (sizeInBytes?: number) => {
    if (!sizeInBytes) return 'Unknown size';
    
    const kb = sizeInBytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }
    
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{startupName} Documents</CardTitle>
        <CardDescription>
          Review important documents provided by the startup
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as DocumentType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center space-x-1">
              <span className="hidden sm:inline">All</span>
              <Badge variant="outline">{documents.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pitch_deck" className="flex items-center">
              <FileText className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Pitch</span>
            </TabsTrigger>
            <TabsTrigger value="financial_report" className="flex items-center">
              <BarChart2 className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="investor_agreement" className="flex items-center">
              <FileCheck className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Agreement</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="all">
              <DocumentList 
                documents={filteredDocuments} 
                emptyMessage="No documents have been uploaded yet." 
              />
            </TabsContent>
            
            <TabsContent value="pitch_deck">
              <DocumentList 
                documents={filteredDocuments} 
                emptyMessage="No pitch deck has been uploaded yet." 
              />
            </TabsContent>
            
            <TabsContent value="financial_report">
              <DocumentList 
                documents={filteredDocuments} 
                emptyMessage="No financial reports have been uploaded yet." 
              />
            </TabsContent>
            
            <TabsContent value="investor_agreement">
              <DocumentList 
                documents={filteredDocuments} 
                emptyMessage="No investor agreement has been uploaded yet." 
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
  
  function DocumentList({ documents, emptyMessage }: { documents: Document[], emptyMessage: string }) {
    if (documents.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-gray-500">
          {emptyMessage}
        </div>
      );
    }
    
    return (
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="bg-gray-100 p-2 rounded-md">
                    {documentIcons[doc.type]}
                  </div>
                  <div>
                    <h3 className="font-medium">{doc.name}</h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Badge variant="outline">{documentTypeLabels[doc.type]}</Badge>
                      <span className="mx-2">•</span>
                      <span>{formatDate(doc.createdAt)}</span>
                      {doc.file_size && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.fileUrl} download={doc.file_name || doc.name}>
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }
}