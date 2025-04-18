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
 * @returns Promise that resolves when download is initiated
 */
export const downloadDocument = async (url: string, filename: string): Promise<boolean> => {
  try {
    console.log("Attempting to download document:", url, filename);
    
    // Check for valid URL
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.error("Invalid document URL for download:", url);
      throw new Error("Invalid document URL");
    }
    
    // For ImageKit URLs, we can use direct download
    if (url.includes('imagekit.io') || url.includes('ik.imagekit.io')) {
      // For PDFs and large files, we'll try to fetch first to ensure proper content disposition
      if (url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('/documents/')) {
        try {
          // Get file content as blob
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/octet-stream',
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          // Create a blob from the response
          const blob = await response.blob();
          
          // Create object URL for download
          const objectUrl = window.URL.createObjectURL(blob);
          
          // Download via anchor
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = filename || 'document';
          document.body.appendChild(a);
          a.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(objectUrl);
          }, 100);
          
          return true;
        } catch (fetchError) {
          console.warn("Fetch approach failed, falling back to direct download:", fetchError);
          // Continue to fallback implementation
        }
      }
    }
    
    // Standard download implementation
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document';
    a.target = '_blank'; // Open in new tab if download doesn't work
    
    // Append and trigger click
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      // Only revoke if it's an object URL (blob:)
      if (url.startsWith('blob:')) {
        window.URL.revokeObjectURL(url);
      }
    }, 100);
    
    return true;
  } catch (error) {
    console.error("Error in downloadDocument:", error);
    
    // Fallback - try to open in new tab
    try {
      window.open(url, '_blank');
      // Return true since we at least managed to open the document
      return true;
    } catch (err) {
      console.error("Fallback also failed:", err);
      throw new Error("Failed to download or open document");
    }
  }
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