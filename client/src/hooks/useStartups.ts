import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Startup, InsertStartup, Document, InsertDocument } from "@shared/schema";
import { uploadStartupDocument, uploadUpiQRCode } from "@/firebase/storage";

export const useStartups = (userId?: number) => {
  const queryClient = useQueryClient();

  // Get all startups
  const getAllStartups = () => {
    return useQuery({
      queryKey: ["/api/startups"],
    });
  };

  // Get startup by ID
  const getStartupById = (startupId: number) => {
    return useQuery({
      queryKey: [`/api/startups/${startupId}`],
    });
  };

  // Get startups by founder ID
  const getStartupsByFounderId = (founderId: number) => {
    return useQuery({
      queryKey: [`/api/startups?founderId=${founderId}`],
      enabled: !!founderId,
    });
  };

  // Create startup
  const createStartup = () => {
    return useMutation({
      mutationFn: async (startupData: InsertStartup) => {
        const response = await apiRequest("POST", "/api/startups", startupData);
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
        if (userId) {
          queryClient.invalidateQueries({ queryKey: [`/api/startups?founderId=${userId}`] });
        }
      },
    });
  };

  // Update startup
  const updateStartup = () => {
    return useMutation({
      mutationFn: async ({ id, ...startupData }: Partial<Startup> & { id: number }) => {
        const response = await apiRequest("PUT", `/api/startups/${id}`, startupData);
        return response.json();
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
        queryClient.invalidateQueries({ queryKey: [`/api/startups/${data.startup.id}`] });
        if (userId) {
          queryClient.invalidateQueries({ queryKey: [`/api/startups?founderId=${userId}`] });
        }
      },
    });
  };

  // Get documents by startup ID
  const getDocumentsByStartupId = (startupId: number) => {
    return useQuery({
      queryKey: [`/api/startups/${startupId}/documents`],
      enabled: !!startupId,
    });
  };

  // Upload document
  const uploadDocument = () => {
    return useMutation({
      mutationFn: async ({ 
        startupId, 
        file, 
        name, 
        type 
      }: { 
        startupId: number; 
        file: File; 
        name: string; 
        type: string;
      }) => {
        // Upload file to Firebase Storage
        const fileUrl = await uploadStartupDocument(startupId, type, file);
        
        // Create document record in database
        const documentData: InsertDocument = {
          startupId,
          name,
          type,
          fileUrl,
        };
        
        const response = await apiRequest(
          "POST", 
          `/api/startups/${startupId}/documents`, 
          documentData
        );
        
        return response.json();
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/startups/${data.document.startupId}/documents`] 
        });
      },
    });
  };

  // Upload UPI QR Code
  const uploadUpiQr = () => {
    return useMutation({
      mutationFn: async ({ 
        startupId, 
        upiId, 
        file 
      }: { 
        startupId: number; 
        upiId: string; 
        file: File;
      }) => {
        // Upload QR code to Firebase Storage
        const qrCodeUrl = await uploadUpiQRCode(startupId, file);
        
        // Update startup with UPI details
        const response = await apiRequest(
          "PUT", 
          `/api/startups/${startupId}`, 
          {
            upiId,
            upiQrCode: qrCodeUrl,
          }
        );
        
        return response.json();
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [`/api/startups/${data.startup.id}`] });
      },
    });
  };

  return {
    getAllStartups,
    getStartupById,
    getStartupsByFounderId,
    createStartup,
    updateStartup,
    getDocumentsByStartupId,
    uploadDocument,
    uploadUpiQr,
  };
};
