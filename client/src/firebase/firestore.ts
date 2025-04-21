// Import mock database functions from our database mock module 
import { 
  ref, 
  set, 
  update,
  get,
  push
} from "./database";

// Import our mock Firestore and database objects
import { firestore, database } from "./config";

// Import schemas from shared
import { User, Startup, Document, Transaction } from "@shared/schema";

// Create a serverTimestamp function that emulates Firebase's
export const serverTimestamp = () => new Date();

// Export Firebase Firestore API equivalent functions
export {
  firestore,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
};

// Create mock Firestore functions that will use our mock objects
// These match the Firebase/Firestore API but will work with our mocks
const collection = (db: any, path: string) => ({
  path,
  db
});

// Overloaded function to handle both Firebase's doc(collection, id) and doc(firestore, collectionPath, id) formats
function doc(collectionRef: any, docId?: string): any;
function doc(firestoreInstance: any, collectionPath: string, docId: string): any;
function doc(arg1: any, arg2?: any, arg3?: any): any {
  // Case 1: doc(collectionRef, docId)
  if (arg3 === undefined && arg2 !== undefined) {
    return {
      id: arg2,
      path: `${arg1.path}/${arg2}`,
      db: arg1.db,
      collection: arg1.path
    };
  }
  // Case 2: doc(firestore, collectionPath, docId)
  else if (arg3 !== undefined) {
    return {
      id: arg3,
      path: `${arg2}/${arg3}`,
      db: arg1,
      collection: arg2
    };
  }
  // Just reference a collection
  else {
    return {
      id: null,
      path: arg1,
      db: null,
      collection: arg1
    };
  }
}

const setDoc = async (docRef: any, data: any) => {
  console.log(`[Firestore Mock] setDoc called on ${docRef.path}`, data);
  return Promise.resolve();
};

const getDoc = async (docRef: any) => {
  console.log(`[Firestore Mock] getDoc called on ${docRef.path}`);
  return {
    exists: () => false,
    id: docRef.id,
    data: () => null,
    ref: docRef
  };
};

const getDocs = async (collectionRef: any) => {
  console.log(`[Firestore Mock] getDocs called on ${collectionRef.path}`);
  return {
    docs: [],
    empty: true,
    forEach: (callback: Function) => {}
  };
};

const addDoc = async (collectionRef: any, data: any) => {
  const id = 'mock-' + Math.random().toString(36).substring(2, 9);
  console.log(`[Firestore Mock] addDoc called on ${collectionRef.path}, generated ID: ${id}`, data);
  return { id, path: `${collectionRef.path}/${id}` };
};

const updateDoc = async (docRef: any, data: any) => {
  console.log(`[Firestore Mock] updateDoc called on ${docRef.path}`, data);
  return Promise.resolve();
};

const deleteDoc = async (docRef: any) => {
  console.log(`[Firestore Mock] deleteDoc called on ${docRef.path}`);
  return Promise.resolve();
};

// Mock query functions
const where = () => ({});
const orderBy = () => ({});

// Mock query function to create a query object with chainable methods
const query = (collectionRef: any, ...queryConstraints: any[]) => {
  console.log(`[Firestore Mock] query called on ${collectionRef.path} with ${queryConstraints.length} constraints`);
  return {
    collectionRef,
    constraints: queryConstraints,
    // Add chainable methods for the query
    get: async () => {
      console.log(`[Firestore Mock] query.get() called on ${collectionRef.path}`);
      return {
        docs: [],
        empty: true,
        forEach: (callback: Function) => {}
      };
    }
  };
};

// User CRUD operations
export const createFirestoreUser = async (
  userId: string, 
  userData: { 
    username: string; 
    email: string; 
    role: string; 
    walletAddress: string; 
    profilePicture?: string;
  }
): Promise<void> => {
  const timestamp = new Date();
  
  // Store in Firestore
  await setDoc(doc(firestore, "users", userId), {
    ...userData,
    createdAt: timestamp,
  });
  
  // Also store in Realtime Database for chat functionality
  await set(ref(database, `users/${userId}`), {
    ...userData,
    createdAt: timestamp.toISOString(),
    id: userId, // Store the ID explicitly for easy reference
    online: true
  });
};

export const getFirestoreUser = async (userId: string): Promise<any> => {
  try {
    // First try to get from Firestore
    const userDoc = await getDoc(doc(firestore, "users", userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    
    // If not in Firestore, try Realtime Database
    const dbRef = ref(database, `users/${userId}`);
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};

export const updateFirestoreUser = async (
  userId: string, 
  userData: Partial<{
    username: string;
    email: string;
    role: string;
    walletAddress: string;
    profilePicture?: string;
    online?: boolean;
    lastActive?: Date;
    [key: string]: any; // Allow any additional fields
  }>
): Promise<void> => {
  // Update Firestore
  await updateDoc(doc(firestore, "users", userId), userData);
  
  // Prepare data for Realtime Database (convert Date objects to ISO strings)
  const realtimeData: Record<string, any> = { ...userData };
  if (realtimeData.lastActive && realtimeData.lastActive instanceof Date) {
    realtimeData.lastActive = realtimeData.lastActive.toISOString();
  }
  
  // Make sure we have valid data for Realtime Database
  Object.keys(realtimeData).forEach(key => {
    // Firebase Realtime Database doesn't accept undefined values
    if (realtimeData[key] === undefined) {
      delete realtimeData[key];
    }
  });
  
  // Update Realtime Database
  await update(ref(database, `users/${userId}`), realtimeData);
};

// Startup CRUD operations
export const createFirestoreStartup = async (startupData: {
  name: string;
  description: string;
  founderId: string | number;
  pitch: string;
  investmentStage: string;
  category?: string | null;
  fundingGoal?: string | null;
  fundingGoalEth?: string | null;  // New field for ETH funding goal
  currentFunding?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  upiId?: string | null;
  upiQrCode?: string | null;
  // Add any other new fields here
  [key: string]: any;  // Allow for additional fields
}): Promise<string> => {
  // Prepare data for Firestore (sanitize the data)
  const sanitizedData = {
    ...startupData,
    category: startupData.category || null,
    fundingGoal: startupData.fundingGoal || null,
    fundingGoalEth: startupData.fundingGoalEth || null,  // Store ETH funding goal
    currentFunding: startupData.currentFunding || null,
    logoUrl: startupData.logoUrl || null,
    websiteUrl: startupData.websiteUrl || null,
    upiId: startupData.upiId || null,
    upiQrCode: startupData.upiQrCode || null,
    createdAt: new Date()
  };
  
  const docRef = await addDoc(collection(firestore, "startups"), sanitizedData);
  return docRef.id;
};

export const getFirestoreStartup = async (startupId: string): Promise<any> => {
  const startupDoc = await getDoc(doc(firestore, "startups", startupId));
  if (startupDoc.exists()) {
    return { id: startupDoc.id, ...startupDoc.data() };
  }
  return null;
};

export const getFirestoreStartups = async (): Promise<any[]> => {
  const querySnapshot = await getDocs(collection(firestore, "startups"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getFirestoreStartupsByFounderId = async (founderId: string | number): Promise<any[]> => {
  const q = query(collection(firestore, "startups"), where("founderId", "==", founderId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateFirestoreStartup = async (startupId: string, startupData: Partial<Startup>): Promise<void> => {
  await updateDoc(doc(firestore, "startups", startupId), startupData);
};

// Document CRUD operations
export const createFirestoreDocument = async (documentData: Omit<Document, "id" | "createdAt"> & {
  // Add additional fields for document metadata
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}): Promise<string> => {
  // Ensure we have the complete document data with file metadata
  const completeDocumentData = {
    ...documentData,
    fileId: documentData.fileId || null,
    fileName: documentData.fileName || null,
    mimeType: documentData.mimeType || null,
    fileSize: documentData.fileSize || null,
    createdAt: new Date(),
  };
  
  const docRef = await addDoc(collection(firestore, "documents"), completeDocumentData);
  return docRef.id;
};

export const getFirestoreDocumentsByStartupId = async (startupId: string | number): Promise<any[]> => {
  const q = query(collection(firestore, "documents"), where("startupId", "==", startupId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Transaction CRUD operations
export const createFirestoreTransaction = async (transactionData: Omit<Transaction, "id" | "createdAt">): Promise<string> => {
  const docRef = await addDoc(collection(firestore, "transactions"), {
    ...transactionData,
    createdAt: new Date(),
  });
  return docRef.id;
};

export const getFirestoreTransactionsByStartupId = async (startupId: string | number): Promise<any[]> => {
  const q = query(
    collection(firestore, "transactions"), 
    where("startupId", "==", startupId),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getFirestoreTransactionsByInvestorId = async (investorId: string | number): Promise<any[]> => {
  const q = query(
    collection(firestore, "transactions"), 
    where("investorId", "==", investorId),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateFirestoreTransactionStatus = async (transactionId: string, status: string): Promise<void> => {
  await updateDoc(doc(firestore, "transactions", transactionId), { status });
};

export const getFirestoreTransactionsByFounderId = async (founderId: string | number): Promise<any[]> => {
  // First get all startups belonging to this founder
  const startups = await getFirestoreStartupsByFounderId(founderId);
  
  if (startups.length === 0) {
    return [];
  }
  
  // Get transactions for all startups owned by this founder
  const transactions: any[] = [];
  
  for (const startup of startups) {
    // Use either the Firebase document ID or the numeric ID
    const startupId = startup.id;
    const startupTransactions = await getFirestoreTransactionsByStartupId(startupId);
    transactions.push(...startupTransactions);
  }
  
  // Sort by date descending
  return transactions.sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });
};
