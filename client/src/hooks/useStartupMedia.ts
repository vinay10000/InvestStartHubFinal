import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { MediaFile } from '@/components/startups/StartupMediaViewer';

interface MediaResponse {
  media: MediaFile[];
}

export function useStartupMedia() {
  const getStartupMedia = (startupId: string) => {
    return useQuery({
      queryKey: ['/api/startups', startupId, 'media'],
      queryFn: () => apiRequest(`/api/startups/${startupId}/media`),
      enabled: !!startupId,
    });
  };

  return {
    getStartupMedia,
  };
}