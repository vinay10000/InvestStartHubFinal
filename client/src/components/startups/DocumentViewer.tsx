import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Document types and their icons/colors
const documentConfig = {
  'pitch_deck': {
    icon: <FileText className="h-5 w-5" />,
    title: 'Pitch Deck',
    description: 'Startup presentation with vision, business model, and growth plans',
    badge: 'primary',
  },
  'financial_report': { 
    icon: <FileText className="h-5 w-5" />, 
    title: 'Financial Report',
    description: 'Financial data, projections, and funding requirements',
    badge: 'secondary',
  },
  'investor_agreement': { 
    icon: <FileText className="h-5 w-5" />, 
    title: 'Investor Agreement',
    description: 'Legal terms and equity details for potential investors',
    badge: 'default',
  },
};

interface Document {
  id: string | number;
  name: string;
  type: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt?: string | Date;
}

interface DocumentViewerProps {
  documents: Document[];
  isLoading?: boolean;
}

const DocumentViewer = ({ documents, isLoading = false }: DocumentViewerProps) => {
  const [activeTab, setActiveTab] = useState<string>("all");

  // Filter documents based on active tab
  const filteredDocuments = activeTab === "all" 
    ? documents 
    : documents.filter(doc => doc.type === activeTab);

  // Group documents by type for better organization
  const documentsByType = documents.reduce((acc, doc) => {
    const type = doc.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Calculate if we have specific document types
  const hasPitchDeck = documents.some(doc => doc.type === 'pitch_deck');
  const hasFinancialReport = documents.some(doc => doc.type === 'financial_report');
  const hasInvestorAgreement = documents.some(doc => doc.type === 'investor_agreement');

  // Format file size in KB or MB
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Startup Documents</CardTitle>
          <CardDescription>Loading documents...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Startup Documents</CardTitle>
          <CardDescription>No documents have been uploaded yet</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              This startup has not uploaded any documents for review. Documents like pitch deck, 
              financial reports, and investor agreements help you evaluate investment opportunities thoroughly.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Startup Documents</CardTitle>
        <CardDescription>
          Review these documents before making your investment decision
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="all">
              All ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="pitch_deck" disabled={!hasPitchDeck}>
              Pitch Deck {hasPitchDeck && `(${documentsByType['pitch_deck']?.length || 0})`}
            </TabsTrigger>
            <TabsTrigger value="financial_report" disabled={!hasFinancialReport}>
              Financial {hasFinancialReport && `(${documentsByType['financial_report']?.length || 0})`}
            </TabsTrigger>
            <TabsTrigger value="investor_agreement" disabled={!hasInvestorAgreement}>
              Agreement {hasInvestorAgreement && `(${documentsByType['investor_agreement']?.length || 0})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex-grow p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {documentConfig[doc.type as keyof typeof documentConfig]?.icon}
                      <h3 className="text-lg font-semibold">{doc.name}</h3>
                      <Badge variant={documentConfig[doc.type as keyof typeof documentConfig]?.badge as any || 'default'}>
                        {documentConfig[doc.type as keyof typeof documentConfig]?.title || doc.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {documentConfig[doc.type as keyof typeof documentConfig]?.description || 
                       'Document for startup review'}
                    </p>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>File: {doc.fileName}</span>
                      <span>Size: {formatFileSize(doc.fileSize)}</span>
                      {doc.createdAt && (
                        <span>
                          Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-muted/50">
                    <div className="flex flex-row sm:flex-col gap-2">
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="no-underline"
                      >
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </a>
                      <a 
                        href={doc.fileUrl} 
                        download={doc.fileName}
                        className="no-underline"
                      >
                        <Button variant="secondary" size="sm" className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {['pitch_deck', 'financial_report', 'investor_agreement'].map(docType => (
            <TabsContent key={docType} value={docType} className="space-y-4">
              {documentsByType[docType]?.map((doc) => (
                <Card key={doc.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="flex-grow p-4">
                      <div className="flex items-center gap-2 mb-1">
                        {documentConfig[docType as keyof typeof documentConfig].icon}
                        <h3 className="text-lg font-semibold">{doc.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {documentConfig[docType as keyof typeof documentConfig].description}
                      </p>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>File: {doc.fileName}</span>
                        <span>Size: {formatFileSize(doc.fileSize)}</span>
                        {doc.createdAt && (
                          <span>
                            Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center p-4 bg-muted/50">
                      <div className="flex flex-row sm:flex-col gap-2">
                        <a 
                          href={doc.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="no-underline"
                        >
                          <Button variant="outline" size="sm" className="w-full">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </a>
                        <a 
                          href={doc.fileUrl} 
                          download={doc.fileName}
                          className="no-underline"
                        >
                          <Button variant="secondary" size="sm" className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DocumentViewer;