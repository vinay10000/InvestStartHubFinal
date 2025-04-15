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
      queryFn: async () => {
        try {
          // Try to get startups from Supabase first (our primary storage)
          const { getSupabaseStartups } = await import("@/services/supabase");
          const supabaseStartups = await getSupabaseStartups();
          
          if (supabaseStartups && supabaseStartups.length > 0) {
            console.log("Retrieved startups from Supabase:", supabaseStartups);
            return { startups: supabaseStartups };
          }
          
          // If no startups in Supabase, try Firestore
          const { getFirestoreStartups } = await import("@/firebase/firestore");
          const firestoreStartups = await getFirestoreStartups();
          
          if (firestoreStartups && firestoreStartups.length > 0) {
            console.log("Retrieved startups from Firestore:", firestoreStartups);
            return { startups: firestoreStartups };
          }
          
          // If still no startups, fall back to the API
          const response = await fetch('/api/startups');
          if (!response.ok) {
            throw new Error('Failed to fetch startups');
          }
          return response.json();
        } catch (error) {
          console.error("Error fetching startups:", error);
          
          // Final fallback to API if everything else fails
          try {
            const response = await fetch('/api/startups');
            if (!response.ok) {
              throw new Error('Failed to fetch startups');
            }
            return response.json();
          } catch (apiError) {
            console.error("API error:", apiError);
            return { startups: [] }; // Return empty array as last resort
          }
        }
      }
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
  const getStartupById = (startupId?: number | string) => {
    if (!startupId) return { data: null, isLoading: false };
    
    return useQuery<{ startup: Startup }>({
      queryKey: ["/api/startups", startupId],
      enabled: !!startupId,
      refetchOnWindowFocus: false,
      retry: 1,
      queryFn: async () => {
        try {
          // Try to get startup from Supabase first (primary storage)
          const { getSupabaseStartupById } = await import("@/services/supabase");
          const supabaseStartup = await getSupabaseStartupById(startupId);
          
          if (supabaseStartup) {
            console.log("Retrieved startup from Supabase:", supabaseStartup);
            return { startup: supabaseStartup };
          }
        } catch (supabaseError) {
          console.error("Error fetching startup from Supabase:", supabaseError);
          // Continue to fallbacks if Supabase fails
        }
        
        // If not found in Supabase or error occurred, try Firestore as fallback
        if (typeof startupId === 'string' && startupId.toString().length > 10) {
          try {
            const { getFirestoreStartup } = await import("@/firebase/firestore");
            const startup = await getFirestoreStartup(startupId);
            if (startup) {
              console.log("Retrieved startup from Firestore:", startup);
              return { startup };
            }
          } catch (firestoreError) {
            console.error("Error fetching startup from Firestore:", firestoreError);
            // Continue to API fallback if Firestore also fails
          }
        }
        
        // Final fallback to API for backward compatibility
        try {
          const response = await fetch(`/api/startups/${startupId}`);
          if (!response.ok) {
            throw new Error("Failed to fetch startup");
          }
          return response.json();
        } catch (apiError) {
          console.error("API error fetching startup:", apiError);
          throw new Error("Startup not found in any storage");
        }
      }
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
        fundingGoalEth?: string | null; // New field for ETH funding
        currentFunding?: string | null;
        logoUrl?: string | null;
        websiteUrl?: string | null;
        upiId?: string | null;
        upiQrCode?: string | null;
        documents?: {
          pitchDeck?: string | null;
          financialReport?: string | null;
          investorAgreement?: string | null;
        };
      }) => {
        // Convert any nulls to empty strings to avoid type errors
        const sanitizedData = {
          ...startupData,
          category: startupData.category || null,
          fundingGoal: startupData.fundingGoal || null,
          fundingGoalEth: startupData.fundingGoalEth || null, // Handle ETH funding goal
          currentFunding: startupData.currentFunding || null,
          logoUrl: startupData.logoUrl || null,
          websiteUrl: startupData.websiteUrl || null,
          upiId: startupData.upiId || null,
          upiQrCode: startupData.upiQrCode || null,
          documents: startupData.documents || null,
        };
        
        try {
          // First try to save to Supabase (our new primary storage)
          const { createSupabaseStartup } = await import("@/services/supabase");
          const supabaseStartup = await createSupabaseStartup(sanitizedData);
          
          // If successful, return the new startup
          if (supabaseStartup) {
            console.log("Startup created in Supabase:", supabaseStartup);
            return supabaseStartup;
          }
        } catch (supabaseError) {
          console.error("Supabase startup creation failed, falling back to alternatives:", supabaseError);
          
          // If Supabase fails, try Firebase as a fallback
          if (typeof sanitizedData.founderId === 'string' && sanitizedData.founderId.toString().length > 10) {
            try {
              const { createFirestoreStartup } = await import("@/firebase/firestore");
              const startupId = await createFirestoreStartup(sanitizedData);
              return { id: startupId, ...sanitizedData };
            } catch (firestoreError) {
              console.error("Firestore startup creation also failed:", firestoreError);
              // Let it fall through to the API fallback
            }
          }
        }
        
        // Final fallback to API
        return apiRequest("/api/startups", {
          method: "POST",
          body: JSON.stringify(sanitizedData),
        });
      },
      onSuccess: (data) => {
        // Invalidate startups query to refetch data
        queryClient.invalidateQueries({ queryKey: ["/api/startups"] });
        queryClient.invalidateQueries({ queryKey: ["firebase/startups"] });
        queryClient.invalidateQueries({ queryKey: ["supabase/startups"] });
        
        toast({
          title: "Startup Created",
          description: "Your startup has been registered successfully",
        });
        
        console.log("Startup created successfully:", data);
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
        name,
        type,
        file
      }: { 
        startupId: number | string;
        name: string;
        type: string;
        file: File; 
      }) => {
        // Create a folder path based on document type
        const folderPath = `startups/${startupId}/documents/${type}`;
        
        // Generate a clean filename (remove spaces and special characters)
        const cleanFileName = file.name
          .replace(/[^a-zA-Z0-9.]/g, '_')
          .toLowerCase();
          
        // Create a FormData object to send the file
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", cleanFileName);
        formData.append("folder", folderPath);
        
        // Upload the file to ImageKit
        const uploadResponse = await apiRequest("/api/imagekit/upload", {
          method: "POST",
          body: formData,
          headers: {}, // Let the browser set the content type for FormData
        });
        
        // Create document record with the file URL and metadata
        const documentData = {
          name,
          type,
          startupId: typeof startupId === 'string' ? startupId : Number(startupId),
          fileUrl: uploadResponse.url,
          fileId: uploadResponse.fileId, // Store ImageKit fileId for future reference
          fileName: cleanFileName,
          mimeType: file.type,
          fileSize: file.size,
        } as unknown as InsertDocument;
        
        try {
          // Try to save document to Supabase first (primary storage)
          const { createSupabaseDocument } = await import("@/services/supabase");
          const supabaseDocument = await createSupabaseDocument(documentData);
          
          if (supabaseDocument) {
            console.log("Document metadata saved to Supabase:", supabaseDocument);
            return { document: supabaseDocument };
          }
        } catch (supabaseError) {
          console.error("Error storing document in Supabase:", supabaseError);
          // Continue with fallbacks if Supabase fails
        }
        
        // If Supabase fails and we're using Firebase (string ID), try Firestore
        if (typeof startupId === 'string' && startupId.toString().length > 10) {
          try {
            const { createFirestoreDocument } = await import("@/firebase/firestore");
            
            // Need to create a new object to avoid TypeScript errors with the startupId type
            const firestoreDocData = {
              ...documentData,
              startupId: startupId
            };
            
            // Use type assertion to bypass the TypeScript check
            const documentId = await createFirestoreDocument(firestoreDocData as any);
            return { document: { id: documentId, ...documentData } };
          } catch (firestoreError) {
            console.error("Error storing document in Firestore:", firestoreError);
            // Let it fall through to the API fallback
          }
        }
        
        // Final fallback to API
        return apiRequest(`/api/startups/${startupId}/documents`, {
          method: "POST",
          body: JSON.stringify(documentData),
        });
      },
      onSuccess: (_, variables) => {
        // Invalidate documents query for this startup
        queryClient.invalidateQueries({ 
          queryKey: ["/api/startups", variables.startupId, "documents"] 
        });
        
        // Also invalidate the startup query since document info might be displayed in startup details
        queryClient.invalidateQueries({
          queryKey: ["/api/startups", variables.startupId]
        });
        
        // Add toast notification
        toast({
          title: "Document Uploaded",
          description: `Your ${variables.type.replace('_', ' ')} has been uploaded successfully`,
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
  const getDocumentsByStartupId = (startupId?: number | string) => {
    if (!startupId) return { data: { documents: [] }, isLoading: false };
    
    return useQuery({
      queryKey: ["/api/startups", startupId, "documents"],
      enabled: !!startupId,
      refetchOnWindowFocus: false,
      queryFn: async () => {
        try {
          // Try Supabase first (primary storage)
          const { getSupabaseDocumentsByStartupId } = await import("@/services/supabase");
          const supabaseDocuments = await getSupabaseDocumentsByStartupId(startupId);
          
          if (supabaseDocuments && supabaseDocuments.length > 0) {
            console.log("Retrieved documents from Supabase:", supabaseDocuments);
            return { documents: supabaseDocuments };
          }
        } catch (supabaseError) {
          console.error("Error fetching documents from Supabase:", supabaseError);
          // Continue to fallbacks if Supabase fails
        }
        
        // If not found in Supabase or error occurred, try Firestore
        if (typeof startupId === 'string' && startupId.toString().length > 10) {
          try {
            const { getFirestoreDocumentsByStartupId } = await import("@/firebase/firestore");
            const firestoreDocuments = await getFirestoreDocumentsByStartupId(startupId);
            
            if (firestoreDocuments && firestoreDocuments.length > 0) {
              console.log("Retrieved documents from Firestore:", firestoreDocuments);
              return { documents: firestoreDocuments };
            }
          } catch (firestoreError) {
            console.error("Error fetching documents from Firestore:", firestoreError);
            // Continue to API fallback if Firestore also fails
          }
        }
        
        // Final fallback to API
        try {
          const response = await fetch(`/api/startups/${startupId}/documents`);
          if (!response.ok) {
            throw new Error("Failed to fetch documents");
          }
          const apiDocuments = await response.json();
          console.log("Retrieved documents from API:", apiDocuments);
          return apiDocuments;
        } catch (apiError) {
          console.error("Error fetching documents from API:", apiError);
          return { documents: [] }; // Return empty array if all methods fail
        }
      }
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