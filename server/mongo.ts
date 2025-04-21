import { MongoClient, ServerApiVersion, MongoClientOptions } from 'mongodb';

// MongoDB connection URI - use MongoDB Atlas or fallback to local URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

// Verify we have a MongoDB URI
if (!uri) {
  console.error("⚠️ WARNING: No MONGODB_URI environment variable found. MongoDB functionality will not work correctly.");
}

// Use improved connection options for compatibility with MongoDB Atlas on Replit
const mongoOptions: MongoClientOptions = {
  // Enhanced connection options for better stability with MongoDB Atlas
  connectTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000
};

// Detect if we're using Atlas
if (uri && uri.includes('mongodb+srv')) {
  console.log("MongoDB Atlas connection detected");
} else {
  console.log("Local MongoDB connection detected");
}

// Create a MongoClient with the improved options
console.log("Creating MongoDB client...");
const client = new MongoClient(uri, mongoOptions);

// Database and collections
let db: any;
// Collection names for all our data types
export const USERS_COLLECTION = 'users';
export const STARTUPS_COLLECTION = 'startups';
export const DOCUMENTS_COLLECTION = 'documents';
export const STARTUP_MEDIA_COLLECTION = 'startup_media';
export const STARTUP_UPDATES_COLLECTION = 'startup_updates';
export const TRANSACTIONS_COLLECTION = 'transactions';
export const CHATS_COLLECTION = 'chats';
export const MESSAGES_COLLECTION = 'messages';
export const WALLET_COLLECTION = 'wallet_addresses';
export const STARTUP_WALLET_COLLECTION = 'startup_wallet_addresses';
export const FIREBASE_USERS_COLLECTION = 'firebase_users';

// Initialize MongoDB connection with fallback strategies
export async function connectToMongoDB() {
  try {
    // Log the MongoDB connection attempt 
    const maskedUri = uri.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:****@');
    console.log(`Attempting to connect to MongoDB with URI: ${maskedUri}`);
    
    // First see if we already have a valid connection
    if (db) {
      try {
        // Try a simple operation to verify the connection is still valid
        await db.command({ ping: 1 });
        console.log("✅ MongoDB connection already established and valid");
        return true;
      } catch (existingConnectionError) {
        console.log("⚠️ Existing MongoDB connection is no longer valid, reconnecting...");
        // Continue with reconnection
      }
    }
    
    try {
      // First strategy: Try normal connection
      console.log("MongoDB Connection Strategy 1: Direct connection with timeout");
      await client.connect();
      console.log("✅ MongoDB Strategy 1 succeeded: Connected to MongoDB successfully");
      
      // Get database reference
      db = client.db("startup_investment_platform");
    } catch (firstError) {
      console.error("❌ MongoDB Strategy 1 failed:", firstError instanceof Error ? firstError.message : String(firstError));
      
      // Second strategy: Try with direct database access
      try {
        console.log("MongoDB Connection Strategy 2: Direct connection to database");
        // Just connect to the database directly
        db = client.db("startup_investment_platform");
        // Verify connection with a ping
        await db.command({ ping: 1 });
        console.log("✅ MongoDB Strategy 2 succeeded: Connected to database directly");
      } catch (secondError) {
        console.error("❌ MongoDB Strategy 2 failed:", secondError instanceof Error ? secondError.message : String(secondError));
        throw secondError; // Pass error to the outer catch block
      }
    }
    
    console.log(`✅ Successfully connected to database: startup_investment_platform`);
    
    // Create the collections if they don't exist
    try {
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map((c: any) => c.name);
      
      // Define all collections we need
      const requiredCollections = [
        USERS_COLLECTION,
        STARTUPS_COLLECTION,
        DOCUMENTS_COLLECTION,
        STARTUP_MEDIA_COLLECTION,
        STARTUP_UPDATES_COLLECTION,
        TRANSACTIONS_COLLECTION,
        CHATS_COLLECTION,
        MESSAGES_COLLECTION,
        WALLET_COLLECTION,
        STARTUP_WALLET_COLLECTION,
        FIREBASE_USERS_COLLECTION
      ];
      
      // Create each collection if it doesn't exist
      for (const collectionName of requiredCollections) {
        if (!collectionNames.includes(collectionName)) {
          await db.createCollection(collectionName);
          console.log(`Created collection: ${collectionName}`);
        }
      }
    } catch (err) {
      console.warn("Non-critical error checking/creating collections:", err);
      // Continue even if this fails
    }
    
    return true;
  } catch (error) {
    console.error("❌ All MongoDB connection strategies failed");
    console.error("❌ Error connecting to MongoDB:", error instanceof Error ? error.message : String(error));
    console.error("❌ Stack trace:", error instanceof Error ? error.stack : 'No stack trace available');
    
    // Try to provide more detailed connection diagnostics
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error("❌ MongoDB connection refused. Check if the MongoDB server is running and accessible.");
      } else if (error.message.includes('authentication failed')) {
        console.error("❌ MongoDB authentication failed. Check your username and password in the connection string.");
      } else if (error.message.includes('timed out')) {
        console.error("❌ MongoDB connection timed out. Check network connectivity and firewall settings.");
      } else if (error.message.includes('MongoNetworkError')) {
        console.error("❌ MongoDB network error. This often happens on Replit with MongoDB Atlas. Check your connection string and network settings.");
      }
    }
    
    // Set up a dummy database and fallback in-memory storage for critical path
    console.warn("Setting up fallback in-memory wallet storage since MongoDB connection failed");
    
    // Don't fail the application, return false to indicate connection failed
    return false;
  }
}

// In-memory fallback storage for data when MongoDB is unavailable
const inMemoryStorage: Record<string, Map<string, any>> = {
  [USERS_COLLECTION]: new Map<string, any>(),
  [STARTUPS_COLLECTION]: new Map<string, any>(),
  [DOCUMENTS_COLLECTION]: new Map<string, any>(),
  [STARTUP_MEDIA_COLLECTION]: new Map<string, any>(),
  [STARTUP_UPDATES_COLLECTION]: new Map<string, any>(),
  [TRANSACTIONS_COLLECTION]: new Map<string, any>(),
  [CHATS_COLLECTION]: new Map<string, any>(),
  [MESSAGES_COLLECTION]: new Map<string, any>(),
  [WALLET_COLLECTION]: new Map<string, any>(),
  [STARTUP_WALLET_COLLECTION]: new Map<string, any>(),
  [FIREBASE_USERS_COLLECTION]: new Map<string, any>()
};

// Get MongoDB database instance with fallback support
export function getDB() {
  if (!db) {
    console.warn("⚠️ MongoDB not initialized. Attempting to connect...");
    
    // Try to connect in the background
    connectToMongoDB().then(connected => {
      if (connected) {
        console.log("✅ Successfully initialized MongoDB connection on demand");
      } else {
        console.error("❌ Failed to initialize MongoDB connection on demand");
      }
    }).catch(err => {
      console.error("❌ Error connecting to MongoDB on demand:", err);
    });
    
    // Return a proxy object that mimics MongoDB collection operations but uses in-memory storage
    return {
      collection: (collectionName: string) => {
        // Get the storage for this collection, or create a new one if it doesn't exist
        if (!inMemoryStorage[collectionName]) {
          inMemoryStorage[collectionName] = new Map<string, any>();
        }
        
        const storage = inMemoryStorage[collectionName];
        
        return {
          // Basic operations supported by our fallback
          findOne: async (query: any) => {
            const key = Object.values(query)[0]?.toString();
            if (!key) return null;
            return storage.get(key) || null;
          },
          updateOne: async (query: any, update: any, options: any) => {
            const key = Object.values(query)[0]?.toString();
            if (!key) return { acknowledged: false };
            
            const doc = options?.upsert 
              ? { ...query, ...update.$set, createdAt: update.$setOnInsert?.createdAt || new Date() }
              : { ...(storage.get(key) || {}), ...update.$set };
            
            storage.set(key, doc);
            return { acknowledged: true, modifiedCount: 1 };
          },
          insertOne: async (doc: any) => {
            const id = doc.id || doc._id || Date.now().toString();
            const key = id.toString();
            storage.set(key, { ...doc, _id: key });
            return { acknowledged: true, insertedId: key };
          },
          find: (query: any = {}) => ({
            sort: () => ({
              toArray: async () => Array.from(storage.values())
            }),
            toArray: async () => Array.from(storage.values())
          }),
          findOneAndUpdate: async (query: any, update: any, options: any) => {
            const key = Object.values(query)[0]?.toString();
            if (!key) return null;
            
            const existingDoc = storage.get(key);
            if (!existingDoc && !options?.upsert) return null;
            
            const doc = existingDoc 
              ? { ...existingDoc, ...update.$set }
              : { ...query, ...update.$set, createdAt: update.$setOnInsert?.createdAt || new Date() };
            
            storage.set(key, doc);
            return doc;
          },
          countDocuments: async () => storage.size,
          listCollections: () => ({
            toArray: async () => []
          }),
          createCollection: async () => ({ acknowledged: true })
        };
      }
    };
  }
  
  return db;
}

// Close MongoDB connection
// Keep track of connections that are in use, only close when all operations are completed
let mongoConnectionInUse = false;
let pendingCloseRequested = false;

export function useMongoConnection() {
  mongoConnectionInUse = true;
  return () => {
    mongoConnectionInUse = false;
    // Don't automatically close the connection when operations complete
    // We want to keep the connection open for faster subsequent requests
    if (pendingCloseRequested) {
      closeMongoDBInternal();
    }
  };
}

// Internal function to actually close the connection
async function closeMongoDBInternal() {
  try {
    // Only close on application shutdown, not between operations
    await client.close(true);
    console.log("MongoDB connection closed");
    pendingCloseRequested = false;
    return true;
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
    pendingCloseRequested = false;
    return false;
  }
}

// Public function that checks if the connection is in use before closing
export async function closeMongoDB() {
  if (mongoConnectionInUse) {
    console.log("MongoDB connection is in use, will close when operations complete");
    pendingCloseRequested = true;
    return false;
  }

  return closeMongoDBInternal();
}