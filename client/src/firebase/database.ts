import { getDatabase, ref, set, get, push, remove, update, query, orderByChild, equalTo } from "firebase/database";
import { database } from "./config";

// Using the database instance from config.ts for consistency

// User related functions
export interface FirebaseUser {
  uid: string;
  id?: string;
  username: string;
  email: string;
  profilePicture?: string;
  role?: string;
  walletAddress?: string;
  createdAt?: string;
  online?: boolean;
  lastActive?: string;
}

// Get user by uid
export const getUserByUid = async (uid: string): Promise<FirebaseUser | null> => {
  try {
    console.log("Getting user by uid:", uid);
    
    // First try to get the user from the users collection
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      console.log("User found in database:", snapshot.val());
      return snapshot.val() as FirebaseUser;
    } else {
      console.log("User not found in database");
      return null;
    }
  } catch (error) {
    console.error("Error getting user by uid:", error);
    return null;
  }
};

// Update user
export const updateUser = async (uid: string, userData: Partial<FirebaseUser>): Promise<FirebaseUser> => {
  try {
    console.log("Updating user with uid:", uid, userData);
    const userRef = ref(database, `users/${uid}`);
    
    // Check if user exists
    const snapshot = await get(userRef);
    
    let updatedData: FirebaseUser;
    
    if (snapshot.exists()) {
      // Update existing user
      const existingData = snapshot.val() as FirebaseUser;
      updatedData = {
        ...existingData,
        ...userData,
        uid // Always ensure uid is set
      };
    } else {
      // Create new user
      updatedData = {
        uid,
        id: uid, // Use uid as id for consistency
        username: userData.username || 'User',
        email: userData.email || '',
        profilePicture: userData.profilePicture || '',
        role: userData.role || 'investor',
        walletAddress: userData.walletAddress || '',
        createdAt: userData.createdAt || new Date().toISOString()
      };
    }
    
    // Save to database
    await set(userRef, updatedData);
    console.log("User updated successfully:", updatedData);
    
    return updatedData;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

// Startup related functions
export interface FirebaseStartup {
  id?: string;
  name: string;
  description: string;
  pitch?: string;
  category?: string | null;
  investment_stage?: string;
  founderId: string;
  funding_goal?: string;
  funding_goal_eth?: string;
  current_funding?: string;
  logo_url?: string | null;
  website_url?: string | null;
  upi_id?: string | null;
  upi_qr_code?: string | null;
  createdAt?: string;
}

// Create a new startup
export const createStartup = async (startupData: FirebaseStartup): Promise<FirebaseStartup> => {
  try {
    if (!startupData.founderId) {
      throw new Error("Founder ID is required to create a startup");
    }

    // Generate a reference with an auto-generated ID
    const startupsRef = ref(database, 'startups');
    const newStartupRef = push(startupsRef);
    const startupId = newStartupRef.key;

    if (!startupId) {
      throw new Error("Failed to generate startup ID");
    }

    // Add ID and creation timestamp
    const startupWithId = {
      ...startupData,
      id: startupId,
      createdAt: new Date().toISOString()
    };

    // Save to database
    await set(newStartupRef, startupWithId);
    console.log("Startup created successfully with ID:", startupId);

    return startupWithId;
  } catch (error) {
    console.error("Error creating startup:", error);
    throw error;
  }
};

// Get all startups
export const getStartups = async (): Promise<FirebaseStartup[]> => {
  try {
    const startupsRef = ref(database, 'startups');
    const snapshot = await get(startupsRef);

    if (snapshot.exists()) {
      const startups: FirebaseStartup[] = [];
      snapshot.forEach((childSnapshot) => {
        const startup = childSnapshot.val();
        startups.push(startup);
      });
      return startups;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error getting startups:", error);
    return [];
  }
};

// Get startups by founder ID
export const getStartupsByFounderId = async (founderId: string): Promise<FirebaseStartup[]> => {
  try {
    if (!founderId) {
      console.error("[database] No founder ID provided");
      return [];
    }

    console.log("[database] Fetching startups for founder ID:", founderId);
    
    // ALWAYS get all startups first - Firebase query with orderByChild may be unreliable
    // with authentication IDs that contain special characters
    const allStartupsRef = ref(database, 'startups');
    const allStartupsSnapshot = await get(allStartupsRef);
    
    let startups: FirebaseStartup[] = [];
    
    if (allStartupsSnapshot.exists()) {
      console.log("[database] Got all startups from database, now filtering for founder:", founderId);
      
      // Log the first startup to understand its structure
      const firstStartup = Object.values(allStartupsSnapshot.val())[0];
      console.log("[database] First startup example:", firstStartup);
      
      // Loop through all startups and filter manually
      allStartupsSnapshot.forEach((childSnapshot) => {
        const startup = childSnapshot.val();
        
        // Direct comparison and flexible matching
        // First try exact string match
        if (startup.founderId === founderId) {
          console.log("[database] Found startup with exact founderId match:", startup.id, startup.name);
          startups.push(startup);
        } 
        // Try normalization - convert both to lowercase for case-insensitive comparison
        else if (String(startup.founderId).toLowerCase() === founderId.toLowerCase()) {
          console.log("[database] Found startup with case-insensitive match:", startup.id, startup.name);
          startups.push(startup);
        }
        // Try trimming - remove whitespace
        else if (String(startup.founderId).trim() === founderId.trim()) {
          console.log("[database] Found startup with trimmed match:", startup.id, startup.name);
          startups.push(startup);
        }
        // Check if one contains the other
        else if (founderId.includes(startup.founderId) || String(startup.founderId).includes(founderId)) {
          console.log("[database] Found startup with partial match:", startup.id, startup.name);
          startups.push(startup);
        }
      });
      
      if (startups.length === 0) {
        console.log("[database] No matches found with standard criteria, now trying flexible matching");
        
        // Second pass with even more flexible matching
        allStartupsSnapshot.forEach((childSnapshot) => {
          const startup = childSnapshot.val();
          
          // Convert both to strings for comparison
          const founderIdStr = String(founderId).toLowerCase();
          const startupFounderIdStr = String(startup.founderId).toLowerCase();
          
          // Check if part of the string matches
          if (founderIdStr.length > 5 && startupFounderIdStr.length > 5) {
            // Try to match the first 5-8 characters at least
            const matchLength = Math.min(8, Math.min(founderIdStr.length, startupFounderIdStr.length));
            
            if (founderIdStr.substring(0, matchLength) === startupFounderIdStr.substring(0, matchLength)) {
              console.log("[database] Found startup with prefix match:", startup.id, startup.name);
              
              // Make sure we're not adding duplicates
              if (!startups.some(s => s.id === startup.id)) {
                startups.push(startup);
              }
            }
          }
        });
      }
    } else {
      console.log("[database] No startups found in database at all");
    }
    
    if (startups.length > 0) {
      console.log(`[database] Successfully found ${startups.length} startups for founder:`, founderId);
      return startups;
    } else {
      console.log("[database] No startups found for founder ID after all attempts:", founderId);
      
      // As a last resort, log all startups in the database for debugging
      if (allStartupsSnapshot.exists()) {
        const allStartups: any[] = [];
        allStartupsSnapshot.forEach(snapshot => {
          allStartups.push({
            id: snapshot.key,
            ...snapshot.val(),
          });
        });
        console.log("[database] All startups in database:", JSON.stringify(allStartups, null, 2));
      }
      
      return [];
    }
  } catch (error) {
    console.error("[database] Error getting startups by founder ID:", error);
    return [];
  }
};

// Get startup by ID
export const getStartupById = async (startupId: string): Promise<FirebaseStartup | null> => {
  try {
    console.log("[database] Looking up startup with ID:", startupId);
    
    // Try to find by direct ID lookup first
    const startupRef = ref(database, `startups/${startupId}`);
    const snapshot = await get(startupRef);

    if (snapshot.exists()) {
      console.log("[database] Found startup by direct ID lookup:", snapshot.val());
      const startup = snapshot.val() as FirebaseStartup;
      // Ensure the startup has its ID
      return { 
        ...startup,
        id: startupId  // Always include the ID
      };
    } 
    
    // If the numeric ID didn't work, try searching all startups
    console.log("[database] Startup not found with direct lookup, checking all startups");
    const allStartupsRef = ref(database, 'startups');
    const allStartupsSnapshot = await get(allStartupsRef);
    
    if (allStartupsSnapshot.exists()) {
      const startups = allStartupsSnapshot.val();
      console.log("[database] Found startups:", Object.keys(startups).length);
      
      // Option 1: Try to find by Firebase key (negative ID format like -OO3Ja4sDg5-dWWVnDgU)
      if (startups[startupId]) {
        console.log("[database] Found by Firebase key in startups collection");
        return { 
          ...startups[startupId],
          id: startupId 
        };
      }
      
      // Option 2: Try to find by numerical ID
      const numericId = parseInt(startupId);
      if (!isNaN(numericId)) {
        for (const key in startups) {
          const startup = startups[key];
          if (startup.id === numericId || startup.id === startupId) {
            console.log("[database] Found startup by numeric id match:", startup);
            return { 
              ...startup,
              id: key  // Use Firebase key as ID
            };
          }
        }
      }
      
      console.log("[database] Startup not found in any lookup method");
    }
    
    return null;
  } catch (error) {
    console.error("Error getting startup by ID:", error);
    return null;
  }
};

// Update a startup
export const updateStartup = async (startupId: string, updates: Partial<FirebaseStartup>): Promise<FirebaseStartup | null> => {
  try {
    const startupRef = ref(database, `startups/${startupId}`);
    
    // First get the current data
    const snapshot = await get(startupRef);
    
    if (!snapshot.exists()) {
      throw new Error(`Startup with ID ${startupId} not found`);
    }
    
    const currentData = snapshot.val() as FirebaseStartup;
    
    // Merge current data with updates
    const updatedData = {
      ...currentData,
      ...updates
    };
    
    // Update in database
    await update(startupRef, updatedData);
    
    return updatedData;
  } catch (error) {
    console.error("Error updating startup:", error);
    return null;
  }
};

// Delete a startup
export const deleteStartup = async (startupId: string): Promise<boolean> => {
  try {
    const startupRef = ref(database, `startups/${startupId}`);
    await remove(startupRef);
    return true;
  } catch (error) {
    console.error("Error deleting startup:", error);
    return false;
  }
};

// Document related functions
export interface FirebaseDocument {
  id?: string;
  startupId: string;
  type: string;
  name: string;
  fileUrl: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt?: string;
}

// Create a document
export const createDocument = async (documentData: FirebaseDocument): Promise<FirebaseDocument> => {
  try {
    // Generate a reference with an auto-generated ID
    const documentsRef = ref(database, 'documents');
    const newDocumentRef = push(documentsRef);
    const documentId = newDocumentRef.key;

    if (!documentId) {
      throw new Error("Failed to generate document ID");
    }

    // Add ID and creation timestamp
    const documentWithId = {
      ...documentData,
      id: documentId,
      createdAt: new Date().toISOString()
    };

    // Save to database
    await set(newDocumentRef, documentWithId);
    console.log("Document created successfully with ID:", documentId);

    return documentWithId;
  } catch (error) {
    console.error("Error creating document:", error);
    throw error;
  }
};

// Get documents by startup ID
export const getDocumentsByStartupId = async (startupId: string): Promise<FirebaseDocument[]> => {
  try {
    console.log("[database] Fetching documents for startup ID:", startupId);
    
    // First try exact match
    const documentsRef = ref(database, 'documents');
    const startupDocumentsQuery = query(documentsRef, orderByChild('startupId'), equalTo(startupId));
    const snapshot = await get(startupDocumentsQuery);

    if (snapshot.exists()) {
      const documents: FirebaseDocument[] = [];
      snapshot.forEach((childSnapshot) => {
        const document = childSnapshot.val();
        documents.push(document);
      });
      console.log(`[database] Found ${documents.length} documents with exact ID match:`, documents);
      return documents;
    } 
    
    // If numerical ID was used, try string comparison
    const numericId = parseInt(startupId);
    if (!isNaN(numericId)) {
      console.log("[database] No documents found with direct match, trying numerical conversion:", numericId);
      
      // Get all documents and filter manually
      const allDocumentsRef = ref(database, 'documents');
      const allSnapshot = await get(allDocumentsRef);
      
      if (allSnapshot.exists()) {
        const documents: FirebaseDocument[] = [];
        allSnapshot.forEach((childSnapshot) => {
          const document = childSnapshot.val();
          
          // Check various ID formats
          if (document.startupId === numericId || 
              document.startupId === startupId ||
              (typeof document.startupId === 'string' && parseInt(document.startupId) === numericId)) {
            documents.push(document);
          }
        });
        
        console.log(`[database] Found ${documents.length} documents with numeric ID comparison:`, documents);
        if (documents.length > 0) {
          return documents;
        }
      }
    }
    
    console.log("[database] No documents found for startup:", startupId);
    return [];
  } catch (error) {
    console.error("Error getting documents by startup ID:", error);
    return [];
  }
};

// Delete a document
export const deleteDocument = async (documentId: string): Promise<boolean> => {
  try {
    const documentRef = ref(database, `documents/${documentId}`);
    await remove(documentRef);
    return true;
  } catch (error) {
    console.error("Error deleting document:", error);
    return false;
  }
};

// Transaction related functions
export interface FirebaseTransaction {
  id?: string;
  startupId: string;
  investorId: string;
  amount: string;
  status: string;
  paymentMethod: string;
  transactionId?: string | null;
  createdAt?: string;
}

// Create a transaction
export const createTransaction = async (transactionData: FirebaseTransaction): Promise<FirebaseTransaction> => {
  try {
    // Generate a reference with an auto-generated ID
    const transactionsRef = ref(database, 'transactions');
    const newTransactionRef = push(transactionsRef);
    const transactionId = newTransactionRef.key;

    if (!transactionId) {
      throw new Error("Failed to generate transaction ID");
    }

    // Add ID and creation timestamp
    const transactionWithId = {
      ...transactionData,
      id: transactionId,
      createdAt: new Date().toISOString()
    };

    // Save to database
    await set(newTransactionRef, transactionWithId);
    console.log("Transaction created successfully with ID:", transactionId);

    return transactionWithId;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
};

// Get transactions by startup ID
export const getTransactionsByStartupId = async (startupId: string): Promise<FirebaseTransaction[]> => {
  try {
    const transactionsRef = ref(database, 'transactions');
    const startupTransactionsQuery = query(transactionsRef, orderByChild('startupId'), equalTo(startupId));
    const snapshot = await get(startupTransactionsQuery);

    if (snapshot.exists()) {
      const transactions: FirebaseTransaction[] = [];
      snapshot.forEach((childSnapshot) => {
        const transaction = childSnapshot.val();
        transactions.push(transaction);
      });
      return transactions;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error getting transactions by startup ID:", error);
    return [];
  }
};

// Get transactions by investor ID
export const getTransactionsByInvestorId = async (investorId: string): Promise<FirebaseTransaction[]> => {
  try {
    const transactionsRef = ref(database, 'transactions');
    const investorTransactionsQuery = query(transactionsRef, orderByChild('investorId'), equalTo(investorId));
    const snapshot = await get(investorTransactionsQuery);

    if (snapshot.exists()) {
      const transactions: FirebaseTransaction[] = [];
      snapshot.forEach((childSnapshot) => {
        const transaction = childSnapshot.val();
        transactions.push(transaction);
      });
      return transactions;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error getting transactions by investor ID:", error);
    return [];
  }
};

// Get transactions by founder ID (uses startup ID as a proxy)
export const getTransactionsByFounderId = async (founderId: string): Promise<FirebaseTransaction[]> => {
  try {
    // First, get all startups owned by this founder
    const founderStartups = await getStartupsByFounderId(founderId);
    
    if (founderStartups.length === 0) {
      return [];
    }
    
    // Get startup IDs
    const startupIds = founderStartups.map(startup => startup.id);
    
    // For each startup, get its transactions
    const allTransactions: FirebaseTransaction[] = [];
    
    for (const startupId of startupIds) {
      if (startupId) {
        const transactions = await getTransactionsByStartupId(startupId);
        allTransactions.push(...transactions);
      }
    }
    
    return allTransactions;
  } catch (error) {
    console.error("Error getting transactions by founder ID:", error);
    return [];
  }
};

// Update transaction status
export const updateTransactionStatus = async (transactionId: string, status: string): Promise<FirebaseTransaction | null> => {
  try {
    const transactionRef = ref(database, `transactions/${transactionId}`);
    
    // First get the current data
    const snapshot = await get(transactionRef);
    
    if (!snapshot.exists()) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }
    
    const currentData = snapshot.val() as FirebaseTransaction;
    
    // Update status
    const updatedData = {
      ...currentData,
      status
    };
    
    // Update in database
    await update(transactionRef, { status });
    
    return updatedData;
  } catch (error) {
    console.error("Error updating transaction status:", error);
    return null;
  }
};