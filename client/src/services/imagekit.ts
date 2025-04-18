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
): Promise<{
  url: string, 
  fileId: string, 
  fileName: string,
  mimeType: string,
  fileSize: number
}> => {
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
    
    return {
      url: data.url,
      fileId: data.fileId || '',
      fileName: uniqueFileName,
      mimeType: file.type,
      fileSize: file.size
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

// Upload startup document with enhanced metadata
export const uploadStartupDocument = async (
  startupId: number | string | undefined,
  documentType: string,
  file: File
): Promise<{
  url: string,
  fileId: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
  thumbnailUrl?: string,
  filePath?: string
}> => {
  try {
    if (!startupId) {
      throw new Error('Startup ID is required for document upload');
    }
    
    // Format a clean filename with timestamp for uniqueness
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const fileName = `${documentType}_${Date.now()}.${fileExtension}`;
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('folder', `startups/${startupId}/documents`);
    formData.append('useUniqueFileName', 'false');
    formData.append('tags', documentType);
    
    // Add more metadata
    if (file.type) {
      formData.append('mimeType', file.type);
    }
    
    // Log the upload attempt for debugging
    console.log(`Uploading ${documentType} document for startup ${startupId}`);
    
    // Upload via our server-side proxy endpoint
    const response = await fetch('/api/imagekit/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload document');
    }
    
    console.log(`Successfully uploaded ${documentType} document:`, data);
    
    return {
      url: data.url,
      fileId: data.fileId || '',
      fileName: file.name, // Original file name
      mimeType: file.type,
      fileSize: data.size || file.size,
      thumbnailUrl: data.thumbnailUrl,
      filePath: data.filePath
    };
  } catch (error) {
    console.error(`Error uploading ${documentType} document:`, error);
    throw new Error(`Failed to upload ${documentType} document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Upload UPI QR code
export const uploadUpiQRCode = async (
  startupId: string | number,
  file: File
): Promise<{
  url: string,
  fileId: string,
  fileName: string,
  mimeType: string,
  fileSize: number
}> => {
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

// Upload document for Firebase integration with enhanced metadata
export const uploadDocumentToImageKit = async (
  startupId: string,
  documentType: string,
  file: File
): Promise<{
  url: string,
  fileId: string,
  name: string,
  mimeType: string,
  fileSize: number,
  thumbnailUrl?: string,
  filePath?: string
}> => {
  try {
    // Format a clean filename with timestamp for uniqueness
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const fileName = `${documentType}_${Date.now()}.${fileExtension}`;
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('folder', `startups/${startupId}/documents`);
    formData.append('useUniqueFileName', 'false');
    formData.append('tags', documentType);
    
    // Add more metadata
    if (file.type) {
      formData.append('mimeType', file.type);
    }
    
    // Upload via our server-side proxy endpoint
    const response = await fetch('/api/imagekit/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload document');
    }
    
    return {
      url: data.url,
      fileId: data.fileId || '',
      name: data.name || file.name, // Get name from server or use original
      mimeType: file.type,
      fileSize: data.size || file.size,
      thumbnailUrl: data.thumbnailUrl,
      filePath: data.filePath
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    throw new Error('Failed to upload document');
  }
};

// Upload startup media (logo, images, videos) with enhanced metadata
export const uploadStartupMedia = async (
  startupId: number | string,
  mediaType: 'logo' | 'image' | 'video',
  file: File
): Promise<{
  url: string,
  fileId: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
  thumbnailUrl?: string,
  height?: number,
  width?: number
}> => {
  try {
    // Validate file type based on mediaType
    const isValid = validateMediaFileType(file, mediaType);
    if (!isValid) {
      throw new Error(`Invalid file format for ${mediaType}`);
    }
    
    // Check file size (max 20MB for any media)
    if (file.size > 20 * 1024 * 1024) {
      throw new Error(`File size should be less than 20MB`);
    }
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${mediaType}_${timestamp}_${safeName}`;
    
    formData.append('fileName', fileName);
    formData.append('folder', `startups/${startupId}/media/${mediaType}`);
    formData.append('useUniqueFileName', 'false');
    formData.append('tags', `${mediaType},startup`);
    
    // Add more metadata
    if (file.type) {
      formData.append('mimeType', file.type);
    }
    
    console.log(`Uploading ${mediaType} for startup ${startupId}`);
    
    // Upload via our server-side proxy endpoint
    const response = await fetch('/api/imagekit/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `Failed to upload ${mediaType}`);
    }
    
    console.log(`Successfully uploaded ${mediaType}:`, data);
    
    return {
      url: data.url,
      fileId: data.fileId || '',
      fileName: file.name, // Original file name
      mimeType: file.type,
      fileSize: data.size || file.size,
      thumbnailUrl: data.thumbnailUrl,
      height: data.height,
      width: data.width
    };
  } catch (error) {
    console.error(`Error uploading ${mediaType}:`, error);
    throw new Error(`Failed to upload ${mediaType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Validate media file type
const validateMediaFileType = (file: File, mediaType: 'logo' | 'image' | 'video'): boolean => {
  const fileType = file.type;
  
  switch (mediaType) {
    case 'logo':
      // Accept only images for logo
      return fileType.startsWith('image/');
      
    case 'image':
      // Accept all standard image formats
      return fileType.startsWith('image/');
      
    case 'video':
      // Accept standard video formats
      return fileType.startsWith('video/') || 
             fileType === 'application/mp4' ||
             fileType === 'video/mp4' ||
             fileType === 'video/webm' ||
             fileType === 'video/quicktime';
             
    default:
      return false;
  }
};

export default {
  uploadFile,
  uploadStartupDocument,
  uploadUpiQRCode,
  uploadDocumentToImageKit,
  uploadStartupMedia,
  deleteFile,
  getAuthenticationParams,
};