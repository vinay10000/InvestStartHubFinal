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
import { firestore } from "./config";
import { User, Startup, Document, Transaction } from "@shared/schema";

// User CRUD operations
export const createFirestoreUser = async (userId: string, userData: Omit<User, "password">): Promise<void> => {
  await setDoc(doc(firestore, "users", userId), {
    ...userData,
    createdAt: new Date(),
  });
};

export const getFirestoreUser = async (userId: string): Promise<any> => {
  const userDoc = await getDoc(doc(firestore, "users", userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
};

export const updateFirestoreUser = async (userId: string, userData: Partial<User>): Promise<void> => {
  await updateDoc(doc(firestore, "users", userId), userData);
};

// Startup CRUD operations
export const createFirestoreStartup = async (startupData: Omit<Startup, "id" | "createdAt">): Promise<string> => {
  const docRef = await addDoc(collection(firestore, "startups"), {
    ...startupData,
    createdAt: new Date(),
  });
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

export const getFirestoreStartupsByFounderId = async (founderId: number): Promise<any[]> => {
  const q = query(collection(firestore, "startups"), where("founderId", "==", founderId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateFirestoreStartup = async (startupId: string, startupData: Partial<Startup>): Promise<void> => {
  await updateDoc(doc(firestore, "startups", startupId), startupData);
};

// Document CRUD operations
export const createFirestoreDocument = async (documentData: Omit<Document, "id" | "createdAt">): Promise<string> => {
  const docRef = await addDoc(collection(firestore, "documents"), {
    ...documentData,
    createdAt: new Date(),
  });
  return docRef.id;
};

export const getFirestoreDocumentsByStartupId = async (startupId: number): Promise<any[]> => {
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

export const getFirestoreTransactionsByStartupId = async (startupId: number): Promise<any[]> => {
  const q = query(
    collection(firestore, "transactions"), 
    where("startupId", "==", startupId),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getFirestoreTransactionsByInvestorId = async (investorId: number): Promise<any[]> => {
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
