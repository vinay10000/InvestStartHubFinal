import { useState } from 'react';
import { 
  BarChart, 
  Download, 
  Eye, 
  FileText, 
  FileCheck, 
  AlertTriangle,
  ExternalLink,
  Table,
  Image,
  Presentation,
  File,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Document } from '@/services/documentService';
import { 
  Table as UITable, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { getDocumentTypeLabel, downloadDocument } from '@/services/documentService';

interface DocumentViewerProps {
  documents: Document[];
  isLoading: boolean;
}

export default function DocumentViewer({ documents, isLoading }: DocumentViewerProps) {
  const [loadingDocument, setLoadingDocument] = useState<string | null>(null);

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return 'Unknown size';
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDocumentIcon = (type: string, mimeType?: string) => {
    // Check document type first
    if (type === 'pitch_deck') return <Presentation className="h-5 w-5" />;
    if (type === 'financial_report') return <BarChart className="h-5 w-5" />;
    if (type === 'investor_agreement') return <FileCheck className="h-5 w-5" />;
    if (type === 'risk_disclosure') return <AlertTriangle className="h-5 w-5" />;
    
    // Fall back to MIME type check
    if (mimeType) {
      if (mimeType.includes('pdf')) return <FileText className="h-5 w-5" />;
      if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) 
        return <Table className="h-5 w-5" />;
      if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) 
        return <Presentation className="h-5 w-5" />;
      if (mimeType.includes('image')) 
        return <Image className="h-5 w-5" />;
    }
    
    // Default
    return <File className="h-5 w-5" />;
  };

  const getDocumentPreviewUrl = (document: Document): string => {
    try {
      // Log the document being previewed
      console.log("Getting preview URL for document:", document);
      
      // For PDFs, Google Docs Viewer provides a good preview
      if (document.mimeType?.includes('pdf')) {
        const encodedUrl = encodeURIComponent(document.fileUrl);
        console.log("Using Google Docs viewer for PDF:", encodedUrl);
        return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
      }
      
      // For images, direct link works
      if (document.mimeType?.includes('image')) {
        console.log("Using direct link for image:", document.fileUrl);
        return document.fileUrl;
      }
      
      // For documents uploaded to ImageKit or other managed services
      if (document.fileUrl.includes('imagekit.io') || 
          document.fileUrl.includes('ik.imagekit.io') || 
          document.fileUrl.includes('cdn.')) {
        console.log("Using direct link for managed document:", document.fileUrl);
        return document.fileUrl;
      }
      
      // For local file uploads
      if (document.fileUrl.startsWith('/uploads/')) {
        console.log("Using local path for upload:", document.fileUrl);
        return document.fileUrl;
      }
      
      // For other documents, we'll use the download link, but log it first
      console.log("Using default document URL:", document.fileUrl);
      return document.fileUrl;
    } catch (error) {
      console.error("Error creating document preview URL:", error);
      // Return original URL as fallback
      return document.fileUrl;
    }
  };

  const handleDownload = async (document: Document) => {
    setLoadingDocument(document.id.toString());
    
    try {
      await downloadDocument(document.fileUrl, document.fileName || document.name || 'document');
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      // Keep loading state for at least 500ms to show feedback to user
      setTimeout(() => setLoadingDocument(null), 500);
    }
  };

  const handlePreview = (document: Document) => {
    const previewUrl = getDocumentPreviewUrl(document);
    window.open(previewUrl, '_blank');
  };

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading documents...</p>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">No documents available</h3>
        <p className="text-muted-foreground">
          Documents have not been uploaded yet.
        </p>
      </Card>
    );
  }

  return (
    <UITable>
      <TableHeader>
        <TableRow>
          <TableHead>Document Type</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="hidden md:table-cell">Size</TableHead>
          <TableHead className="hidden md:table-cell">Uploaded</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((document) => (
          <TableRow key={document.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                {getDocumentIcon(document.type, document.mimeType)}
                <span>{getDocumentTypeLabel(document.type)}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="truncate max-w-[200px]">{document.fileName || document.name}</span>
                {document.mimeType && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {document.mimeType.split('/')[1]?.toUpperCase() || document.mimeType}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {formatFileSize(document.fileSize)}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {formatDate(document.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePreview(document)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="hidden md:inline">View</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownload(document)}
                  disabled={loadingDocument === document.id.toString()}
                >
                  {loadingDocument === document.id.toString() ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  <span className="hidden md:inline">Download</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </UITable>
  );
}