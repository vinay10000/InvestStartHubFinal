import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  addDoc,
  deleteDoc,
  orderBy
} from "firebase/firestore";
import { 
  ref, 
  set, 
  update,
  get,
  push
} from "firebase/database";
import { firestore, database } from "./config";
import { User, Startup, Document, Transaction } from "@shared/schema";

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
