import { 
  User, InsertUser, 
  Startup, InsertStartup,
  Document, InsertDocument,
  Transaction, InsertTransaction,
  Chat, InsertChat,
  Message, InsertMessage
} from "@shared/schema";
import { firestore, realtimeDb } from "./db";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  updateUserWallet(id: number, walletAddress: string): Promise<User | undefined>;
  
  // Startup operations
  getAllStartups(): Promise<Startup[]>;
  getStartup(id: number): Promise<Startup | undefined>;
  getStartupByFirebaseId(firebaseId: string): Promise<Startup | undefined>;
  getStartupsByFounderId(founderId: number): Promise<Startup[]>;
  createStartup(startup: InsertStartup): Promise<Startup>;
  updateStartup(id: number, startupData: Partial<Startup>): Promise<Startup | undefined>;
  
  // Document operations
  getDocument(id: number | string): Promise<Document | undefined>;
  getDocumentsByStartupId(startupId: number | string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  
  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByFounderId(founderId: number): Promise<Transaction[]>;
  getTransactionsByInvestorId(investorId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined>;
  
  // Chat operations
  getChat(id: number): Promise<Chat | undefined>;
  getChatsByFounderId(founderId: number): Promise<Chat[]>;
  getChatsByInvestorId(investorId: number): Promise<Chat[]>;
  createChat(chat: InsertChat): Promise<Chat>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByChatId(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private startups: Map<number, Startup>;
  private documents: Map<number, Document>;
  private transactions: Map<number, Transaction>;
  private chats: Map<number, Chat>;
  private messages: Map<number, Message>;
  
  private userCurrentId: number;
  private startupCurrentId: number;
  private documentCurrentId: number;
  private transactionCurrentId: number;
  private chatCurrentId: number;
  private messageCurrentId: number;

  constructor() {
    this.users = new Map();
    this.startups = new Map();
    this.documents = new Map();
    this.transactions = new Map();
    this.chats = new Map();
    this.messages = new Map();
    
    this.userCurrentId = 1;
    this.startupCurrentId = 1;
    this.documentCurrentId = 1;
    this.transactionCurrentId = 1;
    this.chatCurrentId = 1;
    this.messageCurrentId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const createdAt = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt,
      walletAddress: insertUser.walletAddress || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserWallet(id: number, walletAddress: string): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser = { ...existingUser, walletAddress };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Startup operations
  async getAllStartups(): Promise<Startup[]> {
    return Array.from(this.startups.values());
  }

  async getStartup(id: number): Promise<Startup | undefined> {
    return this.startups.get(id);
  }
  
  async getStartupByFirebaseId(firebaseId: string): Promise<Startup | undefined> {
    // For memory storage, search for startups with a matching founderId or sameId
    const startups = Array.from(this.startups.values());
    
    // First try to find by founderId as a string
    const startupByFounderId = startups.find(
      (startup) => String(startup.founderId) === firebaseId
    );
    
    if (startupByFounderId) {
      return startupByFounderId;
    }
    
    // Then try to find by sameId
    return startups.find(
      (startup) => startup.sameId === firebaseId
    );
  }

  async getStartupsByFounderId(founderId: number): Promise<Startup[]> {
    return Array.from(this.startups.values()).filter(
      (startup) => startup.founderId === founderId,
    );
  }

  async createStartup(insertStartup: InsertStartup): Promise<Startup> {
    const id = this.startupCurrentId++;
    const createdAt = new Date();
    const startup: Startup = { 
      ...insertStartup, 
      id, 
      createdAt,
      upiId: insertStartup.upiId || null,
      upiQrCode: insertStartup.upiQrCode || null
    };
    this.startups.set(id, startup);
    return startup;
  }

  async updateStartup(id: number, startupData: Partial<Startup>): Promise<Startup | undefined> {
    const existingStartup = this.startups.get(id);
    
    if (!existingStartup) {
      return undefined;
    }
    
    const updatedStartup = { ...existingStartup, ...startupData };
    this.startups.set(id, updatedStartup);
    return updatedStartup;
  }

  // Document operations
  async getDocument(id: number | string): Promise<Document | undefined> {
    // Convert string numeric ID to number if needed
    const numericId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
    return typeof numericId === 'number' ? this.documents.get(numericId) : undefined;
  }

  async getDocumentsByStartupId(startupId: number | string): Promise<Document[]> {
    console.log(`Getting documents for startup ID: ${startupId} (type: ${typeof startupId})`);
    
    // Handle both Firebase string IDs and numeric IDs
    return Array.from(this.documents.values()).filter(
      (document) => {
        // For numeric startupId, directly compare
        if (typeof startupId === 'number') {
          return document.startupId === startupId;
        }
        
        // For string startupId, compare as strings
        return String(document.startupId) === startupId;
      }
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentCurrentId++;
    const createdAt = new Date();
    
    console.log(`Creating document with startupId: ${insertDocument.startupId} (type: ${typeof insertDocument.startupId})`);
    
    // Create the document with the original startupId type (string or number)
    const document: Document = { ...insertDocument, id, createdAt };
    this.documents.set(id, document);
    return document;
  }

  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByFounderId(founderId: number): Promise<Transaction[]> {
    // First get all startups by founder ID
    const founderStartups = await this.getStartupsByFounderId(founderId);
    const startupIds = founderStartups.map(startup => startup.id);
    
    // Then get all transactions for those startups
    return Array.from(this.transactions.values()).filter(
      (transaction) => startupIds.includes(transaction.startupId),
    );
  }

  async getTransactionsByInvestorId(investorId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.investorId === investorId,
    );
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionCurrentId++;
    const createdAt = new Date();
    const transaction: Transaction = { 
      ...insertTransaction, 
      id, 
      createdAt,
      transactionId: insertTransaction.transactionId || null
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined> {
    const existingTransaction = this.transactions.get(id);
    
    if (!existingTransaction) {
      return undefined;
    }
    
    const updatedTransaction = { ...existingTransaction, status };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  // Chat operations
  async getChat(id: number): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async getChatsByFounderId(founderId: number): Promise<Chat[]> {
    return Array.from(this.chats.values()).filter(
      (chat) => chat.founderId === founderId,
    );
  }

  async getChatsByInvestorId(investorId: number): Promise<Chat[]> {
    return Array.from(this.chats.values()).filter(
      (chat) => chat.investorId === investorId,
    );
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = this.chatCurrentId++;
    const createdAt = new Date();
    const chat: Chat = { ...insertChat, id, createdAt };
    this.chats.set(id, chat);
    return chat;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (message) => message.chatId === chatId,
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    const createdAt = new Date();
    const message: Message = { ...insertMessage, id, createdAt };
    this.messages.set(id, message);
    return message;
  }
}

export class FirebaseStorage implements IStorage {
  private usersCollection = 'users';
  private startupsCollection = 'startups';
  private documentsCollection = 'documents';
  private transactionsCollection = 'transactions';
  private chatsCollection = 'chats';
  private messagesCollection = 'messages';
  private walletAddressesCollection = 'wallet_addresses';

  constructor() {
    // Ensure Firestore is available
    if (!firestore) {
      console.error('Firebase Firestore is not initialized properly');
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const snapshot = await firestore?.collection(this.usersCollection).doc(String(id)).get();
      if (snapshot && snapshot.exists) {
        return { id: Number(snapshot.id), ...snapshot.data() } as User;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const snapshot = await firestore?.collection(this.usersCollection)
        .where('username', '==', username)
        .limit(1)
        .get();
      
      if (snapshot && !snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: Number(doc.id), ...doc.data() } as User;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      const snapshot = await firestore?.collection(this.usersCollection).get();
      if (!snapshot) return [];
      
      return snapshot.docs.map(doc => ({ 
        id: Number(doc.id), 
        ...doc.data() 
      })) as User[];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const userRef = firestore?.collection(this.usersCollection).doc();
      
      if (!userRef) {
        throw new Error('Failed to create user reference');
      }
      
      const id = Number(userRef.id);
      const createdAt = new Date();
      
      const userData = {
        ...insertUser,
        id,
        createdAt,
        walletAddress: insertUser.walletAddress || null,
        profilePicture: insertUser.profilePicture || null,
        sameId: insertUser.sameId || null
      };
      
      await userRef.set(userData);
      
      // If a wallet address is provided, store it in a special collection
      if (insertUser.walletAddress) {
        await this.storeWalletAddress(id, insertUser.walletAddress);
      }
      
      return userData as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const userRef = firestore?.collection(this.usersCollection).doc(String(id));
      
      if (!userRef) {
        return undefined;
      }
      
      // Get current user data
      const snapshot = await userRef.get();
      if (!snapshot.exists) {
        return undefined;
      }
      
      const currentData = snapshot.data() as User;
      const updatedData = { ...currentData, ...userData };
      
      await userRef.update(updatedData);
      
      // If wallet address is being updated, store it in the special collection
      if (userData.walletAddress) {
        await this.storeWalletAddress(id, userData.walletAddress);
      }
      
      return { id, ...updatedData } as User;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async updateUserWallet(id: number, walletAddress: string): Promise<User | undefined> {
    try {
      const userRef = firestore?.collection(this.usersCollection).doc(String(id));
      
      if (!userRef) {
        return undefined;
      }
      
      // Get current user data
      const snapshot = await userRef.get();
      if (!snapshot.exists) {
        return undefined;
      }
      
      const currentData = snapshot.data() as User;
      const updatedData = { ...currentData, walletAddress };
      
      await userRef.update({ walletAddress });
      
      // Store wallet address in the special collection
      await this.storeWalletAddress(id, walletAddress);
      
      return { id, ...updatedData } as User;
    } catch (error) {
      console.error('Error updating user wallet:', error);
      return undefined;
    }
  }

  // Special method to store wallet addresses in a dedicated collection
  private async storeWalletAddress(userId: number, walletAddress: string): Promise<void> {
    try {
      // Store by user ID
      await firestore?.collection(this.walletAddressesCollection)
        .doc(String(userId))
        .set({
          userId,
          walletAddress,
          updatedAt: new Date()
        });

      // Also store by wallet address for reverse lookup
      await firestore?.collection(`${this.walletAddressesCollection}_reverse`)
        .doc(walletAddress.toLowerCase())
        .set({
          userId,
          walletAddress,
          updatedAt: new Date()
        });
    } catch (error) {
      console.error('Error storing wallet address:', error);
    }
  }

  // Get wallet address by user ID
  async getWalletAddressByUserId(userId: number): Promise<string | null> {
    try {
      const doc = await firestore?.collection(this.walletAddressesCollection)
        .doc(String(userId))
        .get();
      
      if (doc && doc.exists) {
        return doc.data()?.walletAddress || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching wallet address:', error);
      return null;
    }
  }

  // Get user ID by wallet address
  async getUserIdByWalletAddress(walletAddress: string): Promise<number | null> {
    try {
      const doc = await firestore?.collection(`${this.walletAddressesCollection}_reverse`)
        .doc(walletAddress.toLowerCase())
        .get();
      
      if (doc && doc.exists) {
        return doc.data()?.userId || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by wallet address:', error);
      return null;
    }
  }

  // Startup operations
  async getAllStartups(): Promise<Startup[]> {
    try {
      const snapshot = await firestore?.collection(this.startupsCollection).get();
      if (!snapshot) return [];
      
      return snapshot.docs.map(doc => ({ 
        id: Number(doc.id), 
        ...doc.data() 
      })) as Startup[];
    } catch (error) {
      console.error('Error getting all startups:', error);
      return [];
    }
  }

  async getStartup(id: number): Promise<Startup | undefined> {
    try {
      const snapshot = await firestore?.collection(this.startupsCollection).doc(String(id)).get();
      if (snapshot && snapshot.exists) {
        return { id: Number(snapshot.id), ...snapshot.data() } as Startup;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting startup:', error);
      return undefined;
    }
  }
  
  /**
   * Get a startup by its Firebase ID (string ID)
   * This is specifically for handling Firebase UIDs which are strings like "5SddFKVv8ydDMPl4sSnrgPazt3c2"
   */
  async getStartupByFirebaseId(firebaseId: string): Promise<Startup | undefined> {
    try {
      if (!firestore) {
        console.warn('Firestore is not available. Falling back to memory storage for getStartupByFirebaseId()');
        return undefined;
      }
      
      console.log(`[FirebaseStorage] Looking up startup with Firebase ID: ${firebaseId}`);
      
      // First try looking for the startup record directly using the Firebase ID as the document ID
      const startupRef = firestore.collection(this.startupsCollection).doc(firebaseId);
      let snapshot = await startupRef.get();
      
      if (snapshot.exists) {
        const data = snapshot.data() as Omit<Startup, 'id'>;
        return { ...data, id: Number(firebaseId) || 0 } as Startup;
      }
      
      // If not found, try querying with where clause matching on founderId field
      const querySnapshot = await firestore.collection(this.startupsCollection)
        .where('founderId', '==', firebaseId)
        .limit(1)
        .get();
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data() as Omit<Startup, 'id'>;
        const id = Number(doc.id) || 0;
        
        console.log(`[FirebaseStorage] Found startup with founderId=${firebaseId}, startup ID: ${id}`);
        return { ...data, id } as Startup;
      }
      
      // Also try looking for startups with sameId matching the Firebase UID
      // (in case the startup was linked to the founder using sameId)
      const sameIdQuerySnapshot = await firestore.collection(this.startupsCollection)
        .where('sameId', '==', firebaseId)
        .limit(1)
        .get();
        
      if (!sameIdQuerySnapshot.empty) {
        const doc = sameIdQuerySnapshot.docs[0];
        const data = doc.data() as Omit<Startup, 'id'>;
        const id = Number(doc.id) || 0;
        
        console.log(`[FirebaseStorage] Found startup with sameId=${firebaseId}, startup ID: ${id}`);
        return { ...data, id } as Startup;
      }
      
      console.log(`[FirebaseStorage] No startup found for Firebase ID: ${firebaseId}`);
      return undefined;
    } catch (error) {
      console.error('Error getting startup by Firebase ID:', error);
      return undefined;
    }
  }

  async getStartupsByFounderId(founderId: number): Promise<Startup[]> {
    try {
      const snapshot = await firestore?.collection(this.startupsCollection)
        .where('founderId', '==', founderId)
        .get();
      
      if (!snapshot) return [];
      
      return snapshot.docs.map(doc => ({ 
        id: Number(doc.id), 
        ...doc.data() 
      })) as Startup[];
    } catch (error) {
      console.error('Error getting startups by founder ID:', error);
      return [];
    }
  }

  async createStartup(insertStartup: InsertStartup): Promise<Startup> {
    try {
      const startupRef = firestore?.collection(this.startupsCollection).doc();
      
      if (!startupRef) {
        throw new Error('Failed to create startup reference');
      }
      
      const id = Number(startupRef.id);
      const createdAt = new Date();
      
      const startupData = {
        ...insertStartup,
        id,
        createdAt,
        sameId: insertStartup.sameId || null,
        category: insertStartup.category || null,
        fundingGoal: insertStartup.fundingGoal || null,
        currentFunding: insertStartup.currentFunding || null,
        logoUrl: insertStartup.logoUrl || null,
        websiteUrl: insertStartup.websiteUrl || null,
        upiId: insertStartup.upiId || null,
        upiQrCode: insertStartup.upiQrCode || null,
        mediaUrls: insertStartup.mediaUrls || [],
        videoUrl: insertStartup.videoUrl || null
      };
      
      await startupRef.set(startupData);
      
      // Also get the founder's wallet address and store it for this startup
      const founderWallet = await this.getWalletAddressByUserId(insertStartup.founderId);
      if (founderWallet) {
        await firestore?.collection('startup_wallets')
          .doc(String(id))
          .set({
            startupId: id,
            founderId: insertStartup.founderId,
            walletAddress: founderWallet,
            updatedAt: new Date()
          });
      }
      
      return startupData as Startup;
    } catch (error) {
      console.error('Error creating startup:', error);
      throw error;
    }
  }

  async updateStartup(id: number, startupData: Partial<Startup>): Promise<Startup | undefined> {
    try {
      const startupRef = firestore?.collection(this.startupsCollection).doc(String(id));
      
      if (!startupRef) {
        return undefined;
      }
      
      // Get current startup data
      const snapshot = await startupRef.get();
      if (!snapshot.exists) {
        return undefined;
      }
      
      const currentData = snapshot.data() as Startup;
      const updatedData = { ...currentData, ...startupData };
      
      await startupRef.update(updatedData);
      
      return { id, ...updatedData } as Startup;
    } catch (error) {
      console.error('Error updating startup:', error);
      return undefined;
    }
  }

  // Document operations
  async getDocument(id: number | string): Promise<Document | undefined> {
    try {
      const docId = String(id);
      const snapshot = await firestore?.collection(this.documentsCollection).doc(docId).get();
      
      if (snapshot && snapshot.exists) {
        return { id: Number(snapshot.id), ...snapshot.data() } as Document;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting document:', error);
      return undefined;
    }
  }

  async getDocumentsByStartupId(startupId: number | string): Promise<Document[]> {
    try {
      const stringStartupId = String(startupId);
      const snapshot = await firestore?.collection(this.documentsCollection)
        .where('startupId', '==', stringStartupId)
        .get();
      
      if (!snapshot) return [];
      
      return snapshot.docs.map(doc => ({ 
        id: Number(doc.id), 
        ...doc.data() 
      })) as Document[];
    } catch (error) {
      console.error('Error getting documents by startup ID:', error);
      return [];
    }
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    try {
      const docRef = firestore?.collection(this.documentsCollection).doc();
      
      if (!docRef) {
        throw new Error('Failed to create document reference');
      }
      
      const id = Number(docRef.id);
      const createdAt = new Date();
      
      const documentData = {
        ...document,
        id,
        createdAt,
        fileId: document.fileId || null,
        fileName: document.fileName || null,
        mimeType: document.mimeType || null,
        fileSize: document.fileSize || null
      };
      
      await docRef.set(documentData);
      
      return documentData as Document;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      const snapshot = await firestore?.collection(this.transactionsCollection).doc(String(id)).get();
      
      if (snapshot && snapshot.exists) {
        return { id: Number(snapshot.id), ...snapshot.data() } as Transaction;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting transaction:', error);
      return undefined;
    }
  }

  async getTransactionsByFounderId(founderId: number): Promise<Transaction[]> {
    try {
      // First get all startups by founder ID
      const founderStartups = await this.getStartupsByFounderId(founderId);
      if (founderStartups.length === 0) return [];
      
      const startupIds = founderStartups.map(startup => String(startup.id));
      
      // Use array-contains-any to get transactions for multiple startups
      const snapshot = await firestore?.collection(this.transactionsCollection)
        .where('startupId', 'in', startupIds)
        .get();
      
      if (!snapshot) return [];
      
      return snapshot.docs.map(doc => ({ 
        id: Number(doc.id), 
        ...doc.data() 
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions by founder ID:', error);
      return [];
    }
  }

  async getTransactionsByInvestorId(investorId: number): Promise<Transaction[]> {
    try {
      const investorIdStr = String(investorId);
      const snapshot = await firestore?.collection(this.transactionsCollection)
        .where('investorId', '==', investorIdStr)
        .get();
      
      if (!snapshot) return [];
      
      return snapshot.docs.map(doc => ({ 
        id: Number(doc.id), 
        ...doc.data() 
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions by investor ID:', error);
      return [];
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    try {
      const transactionRef = firestore?.collection(this.transactionsCollection).doc();
      
      if (!transactionRef) {
        throw new Error('Failed to create transaction reference');
      }
      
      const id = Number(transactionRef.id);
      const createdAt = new Date();
      
      const transactionData = {
        ...transaction,
        id,
        createdAt,
        transactionId: transaction.transactionId || null
      };
      
      await transactionRef.set(transactionData);
      
      return transactionData as Transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined> {
    try {
      const transactionRef = firestore?.collection(this.transactionsCollection).doc(String(id));
      
      if (!transactionRef) {
        return undefined;
      }
      
      // Get current transaction data
      const snapshot = await transactionRef.get();
      if (!snapshot.exists) {
        return undefined;
      }
      
      const currentData = snapshot.data() as Transaction;
      const updatedData = { ...currentData, status };
      
      await transactionRef.update({ status });
      
      return { id, ...updatedData } as Transaction;
    } catch (error) {
      console.error('Error updating transaction status:', error);
      return undefined;
    }
  }

  // Chat operations
  async getChat(id: number): Promise<Chat | undefined> {
    try {
      const snapshot = await firestore?.collection(this.chatsCollection).doc(String(id)).get();
      
      if (snapshot && snapshot.exists) {
        return { id: Number(snapshot.id), ...snapshot.data() } as Chat;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting chat:', error);
      return undefined;
    }
  }

  async getChatsByFounderId(founderId: number): Promise<Chat[]> {
    try {
      const snapshot = await firestore?.collection(this.chatsCollection)
        .where('founderId', '==', founderId)
        .get();
      
      if (!snapshot) return [];
      
      return snapshot.docs.map(doc => ({ 
        id: Number(doc.id), 
        ...doc.data() 
      })) as Chat[];
    } catch (error) {
      console.error('Error getting chats by founder ID:', error);
      return [];
    }
  }

  async getChatsByInvestorId(investorId: number): Promise<Chat[]> {
    try {
      const snapshot = await firestore?.collection(this.chatsCollection)
        .where('investorId', '==', investorId)
        .get();
      
      if (!snapshot) return [];
      
      return snapshot.docs.map(doc => ({ 
        id: Number(doc.id), 
        ...doc.data() 
      })) as Chat[];
    } catch (error) {
      console.error('Error getting chats by investor ID:', error);
      return [];
    }
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    try {
      const chatRef = firestore?.collection(this.chatsCollection).doc();
      
      if (!chatRef) {
        throw new Error('Failed to create chat reference');
      }
      
      const id = Number(chatRef.id);
      const createdAt = new Date();
      
      const chatData = {
        ...chat,
        id,
        createdAt
      };
      
      await chatRef.set(chatData);
      
      return chatData as Chat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    try {
      const snapshot = await firestore?.collection(this.messagesCollection).doc(String(id)).get();
      
      if (snapshot && snapshot.exists) {
        return { id: Number(snapshot.id), ...snapshot.data() } as Message;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting message:', error);
      return undefined;
    }
  }

  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    try {
      const snapshot = await firestore?.collection(this.messagesCollection)
        .where('chatId', '==', chatId)
        .orderBy('createdAt', 'asc')
        .get();
      
      if (!snapshot) return [];
      
      return snapshot.docs.map(doc => ({ 
        id: Number(doc.id), 
        ...doc.data() 
      })) as Message[];
    } catch (error) {
      console.error('Error getting messages by chat ID:', error);
      return [];
    }
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      const messageRef = firestore?.collection(this.messagesCollection).doc();
      
      if (!messageRef) {
        throw new Error('Failed to create message reference');
      }
      
      const id = Number(messageRef.id);
      const createdAt = new Date();
      
      const messageData = {
        ...message,
        id,
        createdAt
      };
      
      await messageRef.set(messageData);
      
      return messageData as Message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }
}

// Use FirebaseStorage for reliable wallet address storage and retrieval
export const storage = new FirebaseStorage();
