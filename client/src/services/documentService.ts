import supabase from '../lib/supabase';
import { uploadFile } from './imagekit';
import type { Document } from '@shared/schema';

type DocumentType = 'pitch_deck' | 'financial_report' | 'investor_agreement' | 'risk_disclosure';

/**
 * Upload a document to ImageKit and then save the reference in Supabase
 */
export const uploadDocument = async (
  file: File,
  documentType: DocumentType,
  startupId: number | string
): Promise<Document> => {
  try {
    // First, upload the file to ImageKit
    const folder = `startups/${startupId}/documents/${documentType}`;
    const uploadResponse = await uploadFile(file, folder);
    
    // Create a document record in Supabase
    const { data, error } = await supabase
      .from('documents')
      .insert({
        startup_id: startupId,
        name: getDocumentName(documentType, file.name),
        type: documentType,
        file_url: uploadResponse.url,
        file_id: uploadResponse.fileId,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating document in Supabase:', error);
      throw new Error(`Failed to save document: ${error.message}`);
    }
    
    // Map Supabase snake_case to camelCase for our frontend
    return {
      id: data.id,
      startupId: data.startup_id,
      name: data.name,
      type: data.type,
      fileUrl: data.file_url,
      fileId: data.file_id,
      fileName: data.file_name,
      mimeType: data.mime_type,
      fileSize: data.file_size,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error in uploadDocument:', error);
    throw new Error('Failed to upload document');
  }
};

/**
 * Get documents for a startup from Supabase
 */
export const getStartupDocuments = async (startupId: number | string): Promise<Document[]> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching documents:', error);
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }
    
    // Map Supabase snake_case to camelCase for our frontend
    return data.map(doc => ({
      id: doc.id,
      startupId: doc.startup_id,
      name: doc.name,
      type: doc.type,
      fileUrl: doc.file_url,
      fileId: doc.file_id,
      fileName: doc.file_name,
      mimeType: doc.mime_type,
      fileSize: doc.file_size,
      createdAt: doc.created_at
    }));
  } catch (error) {
    console.error('Error in getStartupDocuments:', error);
    return [];
  }
};

/**
 * Generate a user-friendly document name
 */
function getDocumentName(documentType: DocumentType, originalFileName: string): string {
  const typeLabels = {
    'pitch_deck': 'Pitch Deck',
    'financial_report': 'Financial Report',
    'investor_agreement': 'Investor Agreement',
    'risk_disclosure': 'Risk Disclosure'
  };
  
  // Get file extension
  const ext = originalFileName.split('.').pop();
  
  // Create a readable name
  return `${typeLabels[documentType]} (${new Date().toLocaleDateString()}).${ext}`;
}

export default {
  uploadDocument,
  getStartupDocuments
};