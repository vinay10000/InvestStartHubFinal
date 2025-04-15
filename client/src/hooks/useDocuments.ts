import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import documentService from '../services/documentService';
import { Document } from '@shared/schema';

export function useDocuments() {
  const queryClient = useQueryClient();

  // Get documents by startup ID
  const useStartupDocuments = (startupId?: number | string) => {
    return useQuery({
      queryKey: ['documents', 'startup', startupId],
      queryFn: () => startupId ? documentService.getStartupDocuments(startupId) : Promise.resolve([]),
      enabled: !!startupId,
    });
  };

  // Upload document
  const useUploadDocument = () => {
    return useMutation({
      mutationFn: ({ 
        file, 
        documentType, 
        startupId 
      }: { 
        file: File; 
        documentType: 'pitch_deck' | 'financial_report' | 'investor_agreement' | 'risk_disclosure'; 
        startupId: number | string 
      }) => documentService.uploadDocument(file, documentType, startupId),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['documents', 'startup', variables.startupId] });
      },
    });
  };

  return {
    useStartupDocuments,
    useUploadDocument,
  };
}

export default useDocuments;