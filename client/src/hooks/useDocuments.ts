import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as documentService from '@/services/documentService';
import * as imagekit from '@/services/imagekit';
import { useToast } from '@/hooks/use-toast';

// Document types supported by the application
export type DocumentType = 'pitch_deck' | 'financial_report' | 'investor_agreement' | 'risk_disclosure';

type UploadDocumentParams = {
  startupId: string | number;
  documentType: DocumentType;
  file: File;
  name?: string;
};

export function useDocuments() {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get documents for a specific startup
  const getDocumentsByStartupId = (startupId: string | number | undefined) => {
    return useQuery({
      queryKey: ['/api/startups/documents', startupId],
      queryFn: async () => {
        if (!startupId) return { documents: [] };
        const documents = await documentService.getDocumentsByStartupId(startupId);
        return { documents };
      },
      enabled: !!startupId,
    });
  };

  // Upload a document file
  const uploadDocumentFile = async ({
    startupId,
    documentType,
    file,
    name
  }: UploadDocumentParams) => {
    try {
      setIsUploading(true);
      
      // 1. Upload file to ImageKit
      const parsedStartupId = typeof startupId === 'string' ? parseInt(startupId) : startupId;
      const uploadResult = await imagekit.uploadStartupDocument(
        parsedStartupId,
        documentType,
        file
      );
      
      // 2. Create document record in Supabase
      const document = await documentService.createDocument({
        startupId: parsedStartupId,
        type: documentType,
        name: name || file.name,
        fileUrl: uploadResult.url,
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize
      });
      
      // 3. Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/startups/documents', startupId] });
      
      toast({
        title: 'Document uploaded',
        description: `${name || file.name} has been uploaded successfully.`,
      });
      
      return document;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your document. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Delete a document
  const deleteDocument = async (documentId: string | number, fileUrl: string) => {
    try {
      // 1. Delete file from ImageKit
      await imagekit.deleteFile(fileUrl);
      
      // 2. Delete record from Supabase
      await documentService.deleteDocument(documentId);
      
      // 3. Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/startups/documents'] });
      
      toast({
        title: 'Document deleted',
        description: 'The document has been deleted successfully.',
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Delete failed',
        description: 'There was an error deleting your document. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    isUploading,
    getDocumentsByStartupId,
    uploadDocumentFile,
    deleteDocument,
  };
}