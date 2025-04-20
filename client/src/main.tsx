import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { WebSocketProvider } from "./context/WebSocketContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <WebSocketProvider>
      <App />
    </WebSocketProvider>
  </AuthProvider>
);
