import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
// Import the websocket service to initialize it once - it's a singleton
import "./lib/websocketService.js";

// We don't need to import AuthProvider here since App.tsx already includes it
// The QueryClientProvider must come first as AuthProvider depends on it

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
