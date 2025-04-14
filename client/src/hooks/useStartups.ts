import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Startup, InsertStartup, InsertDocument } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const useStartups = (userId?: number | string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all startups
  const getAllStartups = () => {
    return useQuery<{ startups: Startup[] }>({
      queryKey: ["/api/startups"],
      refetchOnWindowFocus: false,
    });
  };

  // Get startups created by a specific founder
  const getStartupsByFounderId = () => {
    // Always fetch all startups for simplicity in this version
    return useQuery<{ startups: Startup[] }>({
      queryKey: ["/api/startups"],
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: 2000, // Refetch every 2 seconds to ensure we get the latest data
    });
  };

  // Get a specific startup by ID
  const getStartupById = (startupId?: number) => {
    if (!startupId) return { data: null, isLoading: false };
    
    return useQuery<Startup>({
      queryKey: ["/api/startups", startupId],
      enabled: !!startupId,
      refetchOnWindowFocus: false,
      retry: 1,
    });
  };

  // Create a new startup
  const createStartup = () => {
    return useMutation({
      mutationFn: async (startupData: {
        name: string;
        description: string;
        founderId: string | number;
        pitch: string;
        investmentStage: string;
        category?: string | null;
        fundingGoal?: string | null;
        currentFunding?: string | null;
        logoUrl?: string | null;
        websiteUrl?: string | null;
        upiId?: string | null;
        upiQrCode?: string | null;
      }) => {
        // Convert any nulls to empty strings to avoid type errors
        const sanitizedData = {
          ...startupData,
          category: startupData.category || null,
          fundingGoal: startupData.fundingGoal || null,
          currentFunding: startupData.currentFunding || null,
          logoUrl: startupData.logoUrl || null,
          websiteUrl: startupData.websiteUrl || null,
          upiId: startupData.upiId || null,
          upiQrCode: startupData.upiQrCode || null,
        };
        
        // Check if we're using Firebase with a string ID
        if (typeof sanitizedData.founderId === 'string' && sanitizedData.founderId.toString().length > 10) {
          // Use Firestore directly
          const { createFirestoreStartup } = await import("@/firebase/firestore");
          const startupId = await createFirestoreStartup(sanitizedData);
          return { id: startupId, ...sanitizedData };
        }
        
        // Fall back to API for backward compatibility
        return apiRequest("/api/startups", {
          method: "POST",
          body: JSON.stringify(sanitizedData),
        });
      },
      onSuccess: () => {
        // Invalidate startups query to refetch data
        queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
        queryClient.invalidateQueries({ queryKey: ["firebase/startups"] });
        
        toast({
          title: "Startup Created",
          description: "Your startup has been registered successfully",
        });
      },
      onError: (error: any) => {
        console.error("Error creating startup:", error);
        toast({
          title: "Creation Failed",
          description: error.message || "Failed to register your startup",
          variant: "destructive",
        });
      },
    });
  };

  // Update a startup - making it a factory function
  const updateStartup = () => {
    return useMutation({
      mutationFn: async ({ 
        id, 
        ...startupData 
      }: { 
        id: number; 
        [key: string]: any;
      }) => {
        return apiRequest(`/api/startups/${id}`, {
          method: "PUT",
          body: JSON.stringify(startupData),
        });
      },
      onSuccess: (_, variables) => {
        // Invalidate specific startup query and all startups
        queryClient.invalidateQueries({ queryKey: ["/api/startups", variables.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
        
        toast({
          title: "Startup Updated",
          description: "Your startup information has been updated",
        });
      },
      onError: (error: any) => {
        console.error("Error updating startup:", error);
        toast({
          title: "Update Failed",
          description: error.message || "Failed to update your startup",
          variant: "destructive",
        });
      },
    });
  };

  // Upload a startup document - making it a factory function
  const uploadDocument = () => {
    return useMutation({
      mutationFn: async ({ 
        startupId, 
        documentData,
        file
      }: { 
        startupId: number; 
        documentData: Omit<InsertDocument, "startupId">;
        file: File; 
      }) => {
        // Create a FormData object to send the file
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", file.name);
        
        // Upload the file to ImageKit
        const uploadResponse = await apiRequest("/api/imagekit/upload", {
          method: "POST",
          body: formData,
          headers: {}, // Let the browser set the content type for FormData
        });
        
        // Create document record with the file URL
        const completeDocumentData = {
          ...documentData,
          startupId,
          fileUrl: uploadResponse.url,
          fileId: uploadResponse.fileId, // Store ImageKit fileId for future reference
        } as InsertDocument;
        
        return apiRequest(`/api/startups/${startupId}/documents`, {
          method: "POST",
          body: JSON.stringify(completeDocumentData),
        });
      },
      onSuccess: (_, variables) => {
        // Invalidate documents query for this startup
        queryClient.invalidateQueries({ 
          queryKey: ["/api/startups", variables.startupId, "documents"] 
        });
        
        toast({
          title: "Document Uploaded",
          description: "Your document has been uploaded successfully",
        });
      },
      onError: (error: any) => {
        console.error("Error uploading document:", error);
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to upload your document",
          variant: "destructive",
        });
      },
    });
  };

  // Upload startup logo - making it a factory function
  const uploadLogo = () => {
    return useMutation({
      mutationFn: async ({ 
        startupId, 
        file
      }: { 
        startupId: number; 
        file: File;
      }) => {
        // Create a FormData object to send the file
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", `logo_${startupId}_${Date.now()}`);
        formData.append("folder", "logos");
        
        // Upload the file to ImageKit
        const uploadResponse = await apiRequest("/api/imagekit/upload", {
          method: "POST",
          body: formData,
          headers: {}, // Let the browser set the content type for FormData
        });
        
        // Update startup with logo URL
        return apiRequest(`/api/startups/${startupId}`, {
          method: "PUT",
          body: JSON.stringify({ logoUrl: uploadResponse.url }),
        });
      },
      onSuccess: (_, variables) => {
        // Invalidate specific startup query
        queryClient.invalidateQueries({ queryKey: ["/api/startups", variables.startupId] });
        queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
        
        toast({
          title: "Logo Uploaded",
          description: "Your startup logo has been updated",
        });
      },
      onError: (error: any) => {
        console.error("Error uploading logo:", error);
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to upload your logo",
          variant: "destructive",
        });
      },
    });
  };

  // Get documents for a specific startup
  const getDocumentsByStartupId = (startupId?: number) => {
    if (!startupId) return { data: { documents: [] }, isLoading: false };
    
    return useQuery({
      queryKey: ["/api/startups", startupId, "documents"],
      enabled: !!startupId,
      refetchOnWindowFocus: false,
    });
  };

  return {
    getAllStartups,
    getStartupsByFounderId,
    getStartupById,
    createStartup,
    updateStartup,
    uploadDocument,
    uploadLogo,
    getDocumentsByStartupId,
  };
};