import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Startup, InsertStartup, InsertDocument } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const useStartups = (userId?: number) => {
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
    if (!userId) return { data: { startups: [] }, isLoading: false };
    
    // Use Firebase directly if we're using Firebase auth system
    if (typeof userId === 'string' && userId.length > 10) {
      return useQuery<{ startups: Startup[] }>({
        queryKey: ["firebase/startups", { founderId: userId }],
        queryFn: async () => {
          // Import here to avoid circular dependencies
          const { getFirestoreStartupsByFounderId } = await import("@/firebase/firestore");
          const startups = await getFirestoreStartupsByFounderId(userId);
          return { startups };
        },
        enabled: !!userId,
        refetchOnWindowFocus: false,
      });
    }
    
    // Fall back to API request for backward compatibility
    return useQuery<{ startups: Startup[] }>({
      queryKey: ["/api/startups", { founderId: userId }],
      enabled: !!userId,
      refetchOnWindowFocus: false,
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
  const createStartup = useMutation({
    mutationFn: async (startupData: InsertStartup) => {
      return apiRequest("/api/startups", {
        method: "POST",
        body: JSON.stringify(startupData),
      });
    },
    onSuccess: () => {
      // Invalidate startups query to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
      
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

  // Update a startup
  const updateStartup = useMutation({
    mutationFn: async ({ 
      startupId, 
      startupData 
    }: { 
      startupId: number; 
      startupData: Partial<InsertStartup> 
    }) => {
      return apiRequest(`/api/startups/${startupId}`, {
        method: "PUT",
        body: JSON.stringify(startupData),
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate specific startup query and all startups
      queryClient.invalidateQueries({ queryKey: ["/api/startups", variables.startupId] });
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

  // Upload a startup document
  const uploadDocument = useMutation({
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
      const completeDocumentData: InsertDocument = {
        ...documentData,
        startupId,
        fileUrl: uploadResponse.url,
        fileId: uploadResponse.fileId,
      };
      
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

  // Upload startup logo
  const uploadLogo = useMutation({
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