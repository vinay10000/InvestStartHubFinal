import ImageKit from 'imagekit';
import { v4 as uuidv4 } from 'uuid';

// Client-side ImageKit instance
const imagekitPublic = {
  publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
  urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT,
  authenticationEndpoint: '/api/imagekit/auth', // We'll create this endpoint
};

// Create a simple client-side auth token for uploads
export const getAuthenticationParams = async () => {
  try {
    const response = await fetch('/api/imagekit/auth');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting ImageKit authentication:', error);
    throw new Error('Failed to get ImageKit authentication');
  }
};

// Upload file to ImageKit via our server to avoid CORS issues
export const uploadFile = async (
  file: File,
  folder: string,
  fileName?: string
): Promise<string> => {
  try {
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Generate a unique filename if not provided
    const uniqueFileName = fileName || `${uuidv4()}-${file.name.replace(/\s+/g, '-')}`;
    formData.append('fileName', uniqueFileName);
    
    // Add folder path
    formData.append('folder', folder);
    
    // Upload via our server-side proxy endpoint
    const response = await fetch('/api/imagekit/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload file');
    }
    
    return data.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

// Upload startup document
export const uploadStartupDocument = async (
  startupId: number,
  documentType: string,
  file: File
): Promise<string> => {
  return uploadFile(file, `startups/${startupId}/documents/${documentType}`);
};

// Upload UPI QR code
export const uploadUpiQRCode = async (
  startupId: number,
  file: File
): Promise<string> => {
  return uploadFile(file, `startups/${startupId}/upi`);
};

// Delete file from ImageKit (Note: This will need server-side implementation)
export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    // Extract file ID from URL
    const fileId = fileUrl.split('/').pop()?.split('.')[0];
    
    if (!fileId) {
      throw new Error('Invalid file URL');
    }
    
    // Call server-side endpoint to delete the file
    const response = await fetch(`/api/imagekit/delete/${fileId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to delete file');
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};

export default {
  uploadFile,
  uploadStartupDocument,
  uploadUpiQRCode,
  deleteFile,
  getAuthenticationParams,
};