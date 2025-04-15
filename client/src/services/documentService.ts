import { apiRequest } from '@/lib/queryClient';

/**
 * Document type definition - matches backend document schema
 */
export interface Document {
  id: string | number;
  startupId: string | number;
  type: string;
  name: string;
  fileUrl: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
}

/**
 * Partial document for creating a new document
 */
export type CreateDocumentDto = Omit<Document, 'id' | 'createdAt'>;

/**
 * Retrieves all documents for a specific startup
 * @param startupId - The ID of the startup
 * @returns Promise containing the fetched documents
 */
export const getDocumentsByStartupId = async (startupId: string | number) => {
  const response = await apiRequest(`/api/startups/${startupId}/documents`, {
    method: 'GET',
  });
  return response.documents || [];
};

/**
 * Creates a new document record in Supabase
 * @param document - The document data to create
 * @returns Promise containing the created document
 */
export const createDocument = async (document: CreateDocumentDto) => {
  if (!document.startupId) {
    throw new Error('startupId is required to create a document');
  }
  
  const response = await apiRequest(`/api/startups/${document.startupId}/documents`, {
    method: 'POST',
    body: JSON.stringify(document),
  });
  return response.document;
};

/**
 * Deletes a specific document 
 * @param documentId - The ID of the document to delete
 * @returns Promise indicating success/failure
 */
export const deleteDocument = async (documentId: string | number) => {
  const response = await apiRequest(`/api/documents/${documentId}`, {
    method: 'DELETE',
  });
  return response;
};

/**
 * Downloads a document by URL
 * @param url - The document URL to download
 * @param filename - The suggested filename for the download
 */
export const downloadDocument = (url: string, filename: string) => {
  // Create an invisible anchor element
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document';
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Get appropriate icon for document type/MIME type
 * @param type - Document type or MIME type
 * @returns Icon identifier
 */
export const getDocumentIcon = (type: string, mimeType?: string) => {
  // Check document type first
  if (type === 'pitch_deck') return 'presentation';
  if (type === 'financial_report') return 'chart';
  if (type === 'investor_agreement') return 'file-check';
  if (type === 'risk_disclosure') return 'alert-triangle';
  
  // Fall back to MIME type check
  if (mimeType) {
    if (mimeType.includes('pdf')) return 'file-text';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) 
      return 'table';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) 
      return 'presentation';
    if (mimeType.includes('image')) 
      return 'image';
  }
  
  // Default
  return 'file';
};

/**
 * Get human-readable label for document type
 * @param type - Document type
 * @returns Human-readable label
 */
export const getDocumentTypeLabel = (type: string): string => {
  // Convert snake_case to Title Case
  if (type.includes('_')) {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // Convert camelCase to Title Case
  return type
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
};