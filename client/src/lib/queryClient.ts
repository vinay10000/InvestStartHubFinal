import { QueryClient } from "@tanstack/react-query";

/**
 * Helper function for making API requests
 */
export async function apiRequest(url: string, options: RequestInit = {}) {
  // Set default headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Make the request
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies for session
  });

  // Handle errors
  if (!response.ok) {
    // Try to parse error response as JSON
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || "API request failed");
    } catch (e) {
      // If JSON parsing fails, use status text
      if (e instanceof Error && e.message !== "API request failed") {
        throw e;
      }
      throw new Error(response.statusText || "API request failed");
    }
  }

  // Parse response if it has content
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return { success: true };
}

/**
 * Default QueryClient configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      queryFn: async ({ queryKey }) => {
        // Extract URL and params from queryKey
        const [url, params] = queryKey as [string, Record<string, any>?];
        
        // Build query string for GET requests
        let fullUrl = url;
        if (params) {
          const queryString = Object.entries(params)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
            .join("&");
          
          if (queryString) {
            fullUrl += (url.includes("?") ? "&" : "?") + queryString;
          }
        }
        
        // Make the request
        return await apiRequest(fullUrl);
      },
    },
    mutations: {
      retry: 1,
    },
  },
});