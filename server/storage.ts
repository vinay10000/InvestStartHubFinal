import { 
  users, User, InsertUser, 
  startups, Startup, InsertStartup,
  documents, Document, InsertDocument,
  transactions, Transaction, InsertTransaction,
  chats, Chat, InsertChat,
  messages, Message, InsertMessage
} from "@shared/schema";

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

export const storage = new MemStorage();
