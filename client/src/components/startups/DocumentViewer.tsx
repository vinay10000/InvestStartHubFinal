import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, ExternalLink, FileArchive, FileImage, ChevronDown, ChevronUp } from "lucide-react";

interface Document {
  id: string | number;
  name: string;
  type: string;
  fileUrl: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  createdAt?: string | Date;
}

interface DocumentViewerProps {
  documents: Document[];
  isLoading?: boolean;
}

const DocumentViewer = ({ documents, isLoading = false }: DocumentViewerProps) => {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedDocId, setExpandedDocId] = useState<string | number | null>(null);

  // Group documents by type
  const documentsByType = {
    all: documents,
    pitch_deck: documents.filter(doc => doc.type === 'pitch_deck'),
    financial_report: documents.filter(doc => doc.type === 'financial_report'),
    investor_agreement: documents.filter(doc => doc.type === 'investor_agreement'),
    risk_disclosure: documents.filter(doc => doc.type === 'risk_disclosure')
  };

  const toggleExpand = (id: string | number) => {
    if (expandedDocId === id) {
      setExpandedDocId(null);
    } else {
      setExpandedDocId(id);
    }
  };

  // Function to get the document type icon
  const getDocumentIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="h-5 w-5" />;
    
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (mimeType.includes('image')) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileText className="h-5 w-5 text-blue-600" />;
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileText className="h-5 w-5 text-green-600" />;
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return <FileText className="h-5 w-5 text-orange-500" />;
    }
    
    return <FileArchive className="h-5 w-5" />;
  };

  // Function to format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Function to format date
  const formatDate = (date?: string | Date) => {
    if (!date) return 'Unknown date';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get the formatted document type label
  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'pitch_deck':
        return 'Pitch Deck';
      case 'financial_report':
        return 'Financial Report';
      case 'investor_agreement':
        return 'Investor Agreement / Terms Sheet';
      case 'risk_disclosure':
        return 'Risk Disclosure';
      default:
        return 'Document';
    }
  };

  // Get badge color based on document type
  const getDocumentTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'pitch_deck':
        return 'bg-blue-100 text-blue-800';
      case 'financial_report':
        return 'bg-green-100 text-green-800';
      case 'investor_agreement':
        return 'bg-purple-100 text-purple-800';
      case 'risk_disclosure':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-medium mb-2">No documents available</h3>
        <p className="text-gray-500">
          No documents have been uploaded yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            All ({documentsByType.all.length})
          </TabsTrigger>
          {documentsByType.pitch_deck.length > 0 && (
            <TabsTrigger value="pitch_deck">
              Pitch Deck ({documentsByType.pitch_deck.length})
            </TabsTrigger>
          )}
          {documentsByType.financial_report.length > 0 && (
            <TabsTrigger value="financial_report">
              Financial ({documentsByType.financial_report.length})
            </TabsTrigger>
          )}
          {documentsByType.investor_agreement.length > 0 && (
            <TabsTrigger value="investor_agreement">
              Agreements ({documentsByType.investor_agreement.length})
            </TabsTrigger>
          )}
          {documentsByType.risk_disclosure.length > 0 && (
            <TabsTrigger value="risk_disclosure">
              Risk ({documentsByType.risk_disclosure.length})
            </TabsTrigger>
          )}
        </TabsList>

        {Object.entries(documentsByType).map(([type, docs]) => (
          <TabsContent key={type} value={type} className="space-y-3">
            {docs.map(doc => (
              <Card key={doc.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getDocumentIcon(doc.mimeType)}
                      <div>
                        <h4 className="font-medium text-md">{doc.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getDocumentTypeBadgeStyle(doc.type)}>
                            {getDocumentTypeLabel(doc.type)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(doc.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleExpand(doc.id)}
                      className="ml-2"
                    >
                      {expandedDocId === doc.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </Button>
                  </div>
                  
                  {expandedDocId === doc.id && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex flex-col space-y-2">
                        <p className="text-sm text-gray-500">
                          {doc.fileSize ? `File size: ${formatFileSize(doc.fileSize)}` : 'Size not available'}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button
                            variant="outline" 
                            size="sm"
                            className="flex items-center"
                            asChild
                          >
                            <a 
                              href={doc.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-1 h-4 w-4" />
                              View
                            </a>
                          </Button>
                          
                          <Button
                            variant="outline" 
                            size="sm"
                            className="flex items-center"
                            asChild
                          >
                            <a 
                              href={doc.fileUrl} 
                              download={doc.fileName || doc.name}
                            >
                              <Download className="mr-1 h-4 w-4" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default DocumentViewer;