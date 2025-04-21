import { QueryClient } from "@tanstack/react-query";

export type ApiRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type GetQueryFnOptions = {
  on401?: "throw" | "returnNull";
};

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

/**
 * Standard API request function for making fetch requests
 * Handles authentication headers and error cases consistently
 */
export const apiRequest = async (
  method: ApiRequestMethod,
  path: string,
  body?: any
): Promise<Response> => {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Important for cookies/sessions
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(path, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: "An unknown error occurred",
    }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  return response;
};

/**
 * Create a query function for use with useQuery
 * Handles common error cases and authentication
 */
export const getQueryFn = (options: GetQueryFnOptions = {}) => {
  return async ({ queryKey }: { queryKey: string[] }): Promise<any> => {
    const path = queryKey[0];
    try {
      const response = await apiRequest("GET", path);
      return await response.json();
    } catch (error: any) {
      if (error.message?.includes("401") && options.on401 === "returnNull") {
        return null;
      }
      throw error;
    }
  };
};