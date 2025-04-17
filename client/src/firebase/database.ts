import { getDatabase, ref, set, get, push, remove, update, query, orderByChild, equalTo } from "firebase/database";
import { app } from "./firebase";

// Initialize the Firebase Realtime Database
const database = getDatabase(app);

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
      console.error("No founder ID provided");
      return [];
    }

    console.log("Fetching startups for founder ID:", founderId);
    
    const startupsRef = ref(database, 'startups');
    const founderStartupsQuery = query(startupsRef, orderByChild('founderId'), equalTo(founderId));
    const snapshot = await get(founderStartupsQuery);

    if (snapshot.exists()) {
      const startups: FirebaseStartup[] = [];
      snapshot.forEach((childSnapshot) => {
        const startup = childSnapshot.val();
        startups.push(startup);
      });
      return startups;
    } else {
      console.log("No startups found for founder ID:", founderId);
      return [];
    }
  } catch (error) {
    console.error("Error getting startups by founder ID:", error);
    return [];
  }
};

// Get startup by ID
export const getStartupById = async (startupId: string): Promise<FirebaseStartup | null> => {
  try {
    const startupRef = ref(database, `startups/${startupId}`);
    const snapshot = await get(startupRef);

    if (snapshot.exists()) {
      return snapshot.val() as FirebaseStartup;
    } else {
      return null;
    }
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
    const documentsRef = ref(database, 'documents');
    const startupDocumentsQuery = query(documentsRef, orderByChild('startupId'), equalTo(startupId));
    const snapshot = await get(startupDocumentsQuery);

    if (snapshot.exists()) {
      const documents: FirebaseDocument[] = [];
      snapshot.forEach((childSnapshot) => {
        const document = childSnapshot.val();
        documents.push(document);
      });
      return documents;
    } else {
      return [];
    }
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