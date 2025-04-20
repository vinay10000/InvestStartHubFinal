import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { StartupUpdate } from '@/components/startups/StartupUpdates';

interface UpdatesResponse {
  updates: StartupUpdate[];
}

export function useStartupUpdates() {
  const getStartupUpdates = (startupId: string) => {
    return useQuery({
      queryKey: ['/api/startups', startupId, 'updates'],
      queryFn: () => apiRequest(`/api/startups/${startupId}/updates`),
      enabled: !!startupId,
    });
  };

  return {
    getStartupUpdates,
  };
}