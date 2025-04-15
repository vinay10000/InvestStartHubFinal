import { supabase } from '@/lib/supabase';
import { Document } from '@shared/schema';

/**
 * Retrieves all documents for a specific startup
 * @param startupId - The ID of the startup
 * @returns Promise containing the fetched documents
 */
export const getDocumentsByStartupId = async (startupId: string | number) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('startup_id', startupId);
    
    if (error) {
      throw error;
    }
    
    return { documents: data || [] };
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

/**
 * Creates a new document record in Supabase
 * @param document - The document data to create
 * @returns Promise containing the created document
 */
export const createDocument = async (document: Partial<Document>) => {
  try {
    // Convert camelCase to snake_case for Supabase
    const { 
      startupId, 
      fileUrl, 
      fileId, 
      fileName, 
      mimeType, 
      fileSize,
      ...restOfDocument 
    } = document;

    const documentData = {
      ...restOfDocument,
      startup_id: startupId,
      file_url: fileUrl,
      file_id: fileId,
      file_name: fileName,
      mime_type: mimeType,
      file_size: fileSize,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return { document: data };
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
};

/**
 * Deletes a specific document 
 * @param documentId - The ID of the document to delete
 * @returns Promise indicating success/failure
 */
export const deleteDocument = async (documentId: string | number) => {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};