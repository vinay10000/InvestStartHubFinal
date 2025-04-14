import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./config";
import { v4 as uuidv4 } from 'uuid';

// Upload file to Firebase Storage
export const uploadFile = async (
  file: File, 
  path: string
): Promise<string> => {
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const storageRef = ref(storage, `${path}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
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

// Delete file from Firebase Storage
export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
};
