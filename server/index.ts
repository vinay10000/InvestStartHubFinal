import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerImageKitRoutes } from "./imagekit";
import { connectToMongoDB } from "./mongo";
import { initKnownWalletAddresses } from "./mongo-wallet-utils";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/**
 * Initialize MongoDB wallet addresses with retries
 * This function attempts to initialize wallet addresses with exponential backoff
 * in case of transient connection issues
 */
async function initializeWalletAddressesWithRetry(
  attempt: number = 1, 
  maxAttempts: number = 5, 
  initialDelay: number = 1000
): Promise<void> {
  try {
    await initKnownWalletAddresses();
    log('✅ Successfully initialized known wallet addresses in MongoDB');
  } catch (error) {
    const delay = initialDelay * Math.pow(2, attempt - 1);
    log(`⚠️ Error initializing MongoDB wallet addresses (attempt ${attempt}/${maxAttempts}): ${error}`);
    
    if (attempt < maxAttempts) {
      log(`⏱️ Retrying in ${delay}ms...`);
      setTimeout(() => {
        initializeWalletAddressesWithRetry(attempt + 1, maxAttempts, initialDelay)
          .catch(err => log('❌ Final error in MongoDB wallet initialization:', err));
      }, delay);
    } else {
      log(`❌ Failed to initialize MongoDB wallet addresses after ${maxAttempts} attempts`);
    }
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use("/uploads", express.static(uploadsDir));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize MongoDB connection with timeout
  try {
    log('Connecting to MongoDB with timeout protection');
    
    // Set up a promise race between the MongoDB connection and a timeout
    const timeoutMs = 10000; // 10 seconds timeout
    const connectPromise = connectToMongoDB();
    const timeoutPromise = new Promise<false>((resolve) => {
      setTimeout(() => {
        log(`⏱️ MongoDB connection timeout after ${timeoutMs}ms, continuing startup with retries`);
        resolve(false);
      }, timeoutMs);
    });
    
    // Race the connection against the timeout
    const mongoConnected = await Promise.race([connectPromise, timeoutPromise]);
    
    if (mongoConnected) {
      log('✅ Successfully connected to MongoDB');
      
      // Initialize known wallet addresses in MongoDB with retries (don't block startup)
      log('Initializing known wallet addresses in MongoDB');
      initializeWalletAddressesWithRetry();
    } else {
      log('⚠️ Initial MongoDB connection timed out, proceeding with retries');
      
      // Continue connecting to MongoDB in the background
      connectToMongoDB().then(connected => {
        if (connected) {
          log('✅ Late MongoDB connection succeeded, initializing known wallet addresses');
          initializeWalletAddressesWithRetry();
        } else {
          log('⚠️ MongoDB connection retry failed - application may have limited functionality');
        }
      }).catch(err => {
        log('⚠️ Background MongoDB connection failed: ' + err);
      });
    }
  } catch (error) {
    log('❌ Error initializing MongoDB database connection: ' + error);
    
    // Try one more time to connect
    setTimeout(() => {
      log('🔄 Retrying MongoDB connection after error...');
      connectToMongoDB().then(connected => {
        if (connected) {
          log('✅ Retry MongoDB connection succeeded, initializing known wallet addresses');
          initializeWalletAddressesWithRetry();
        } else {
          log('⚠️ MongoDB connection retry failed - application may have limited functionality');
        }
      }).catch(err => {
        log('❌ Final MongoDB connection attempt failed: ' + err);
      });
    }, 5000);
  }

  const server = await registerRoutes(app);

  // Register ImageKit routes
  registerImageKitRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite only in development
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use 0.0.0.0 for Replit to make the server accessible externally
  // Default to port 5000 for Replit workflows
  const port = Number(process.env.PORT) || 5000;

  server.listen(port, "0.0.0.0", () => {
    log(`🚀 Server running on http://0.0.0.0:${port}`);
  });
})();