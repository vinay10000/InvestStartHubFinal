/**
 * MongoDB Storage Implementation
 * 
 * This file provides a MongoDB implementation of the IStorage interface,
 * allowing the application to use MongoDB Atlas for all data storage needs.
 */

import { 
  InsertUser, InsertStartup, InsertDocument, InsertTransaction, 
  InsertChat, InsertMessage, User, Startup, Document, 
  Transaction, Chat, Message
} from '@shared/schema';
import { getDB, useMongoConnection } from './mongo';
import { IStorage } from './storage';

// Collection names
const USERS_COLLECTION = 'users';
const STARTUPS_COLLECTION = 'startups';
const DOCUMENTS_COLLECTION = 'documents';
const TRANSACTIONS_COLLECTION = 'transactions';
const CHATS_COLLECTION = 'chats';
const MESSAGES_COLLECTION = 'messages';
const WALLET_COLLECTION = 'wallet_addresses';
const STARTUP_WALLET_COLLECTION = 'startup_wallet_addresses'; 

export class MongoStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const user = await db.collection(USERS_COLLECTION).findOne({ id: Number(id) });
      return user ? user as User : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error getting user ${id}:`, error);
      return undefined;
    } finally {
      // Always release the connection in finally block
      releaseConnection();
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const user = await db.collection(USERS_COLLECTION).findOne({ username });
      return user ? user as User : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error getting user by username ${username}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async getAllUsers(): Promise<User[]> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const users = await db.collection(USERS_COLLECTION).find().toArray();
      return users as User[];
    } catch (error) {
      console.error(`[mongo-storage] Error getting all users:`, error);
      return [];
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      
      // Get the next ID by counting documents
      const count = await db.collection(USERS_COLLECTION).countDocuments();
      const id = count + 1;
      
      const now = new Date();
      const user: User = {
        ...insertUser,
        id,
        createdAt: now,
        walletAddress: insertUser.walletAddress || null,
        profilePicture: insertUser.profilePicture || null,
        sameId: insertUser.sameId || null
      };
      
      await db.collection(USERS_COLLECTION).insertOne(user);
      
      // If the user has a wallet address, also store it in dedicated wallet collection
      if (user.walletAddress) {
        console.log(`[mongo-storage] Storing wallet address ${user.walletAddress} for new user ID ${id}`);
        await db.collection(WALLET_COLLECTION).updateOne(
          { userId: id.toString() },
          {
            $set: {
              userId: id.toString(),
              walletAddress: user.walletAddress.toLowerCase(),
              dataSource: 'user_creation',
              updatedAt: now
            },
            $setOnInsert: { createdAt: now }
          },
          { upsert: true }
        );
      }
      
      return user;
    } catch (error) {
      console.error(`[mongo-storage] Error creating user:`, error);
      throw error;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      
      // Exclude id from the update
      const { id: _, ...updateData } = userData;
      
      console.log(`[mongo-storage] Updating user ${id} with data fields: ${Object.keys(updateData).join(', ')}`);
      
      const result = await db.collection(USERS_COLLECTION).findOneAndUpdate(
        { id: Number(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      return result ? result as User : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error updating user ${id}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async updateUserWallet(id: number, walletAddress: string): Promise<User | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      
      console.log(`[mongo-storage] Updating wallet address for user ${id} to: ${walletAddress}`);
      
      const result = await db.collection(USERS_COLLECTION).findOneAndUpdate(
        { id: Number(id) },
        { $set: { walletAddress } },
        { returnDocument: 'after' }
      );
      
      // Also update in the dedicated wallet collection
      await db.collection(WALLET_COLLECTION).updateOne(
        { userId: id.toString() },
        { 
          $set: { 
            userId: id.toString(),
            walletAddress: walletAddress.toLowerCase(),
            dataSource: 'app_update',
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
      
      return result ? result as User : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error updating user wallet ${id}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection(); 
    }
  }
  
  // Startup operations
  async getAllStartups(): Promise<Startup[]> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const startups = await db.collection(STARTUPS_COLLECTION).find().toArray();
      return startups as Startup[];
    } catch (error) {
      console.error(`[mongo-storage] Error getting all startups:`, error);
      return [];
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async getStartup(id: number): Promise<Startup | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const startup = await db.collection(STARTUPS_COLLECTION).findOne({ id: Number(id) });
      return startup ? startup as Startup : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error getting startup ${id}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async getStartupByMongoId(mongoId: string): Promise<Startup | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      // Try to find by string ID which could be a MongoDB ID
      const startup = await db.collection(STARTUPS_COLLECTION).findOne({ id: mongoId });
      return startup ? startup as Startup : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error getting startup by MongoDB ID ${mongoId}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async getStartupsByFounderId(founderId: number): Promise<Startup[]> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const founderIdStr = founderId.toString();
      const startups = await db.collection(STARTUPS_COLLECTION)
        .find({ founderId: founderIdStr })
        .toArray();
      return startups as Startup[];
    } catch (error) {
      console.error(`[mongo-storage] Error getting startups by founder ID ${founderId}:`, error);
      return [];
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async createStartup(insertStartup: InsertStartup): Promise<Startup> {
    // Get a connection release function 
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      
      // Get the next ID by counting documents
      const count = await db.collection(STARTUPS_COLLECTION).countDocuments();
      const id = count + 1;
      
      const now = new Date();
      const startup: Startup = {
        ...insertStartup,
        id,
        createdAt: now,
        category: insertStartup.category || null,
        fundingGoal: insertStartup.fundingGoal || null,
        currentFunding: insertStartup.currentFunding || null,
        logoUrl: insertStartup.logoUrl || null,
        websiteUrl: insertStartup.websiteUrl || null,
        upiId: insertStartup.upiId || null,
        upiQrCode: insertStartup.upiQrCode || null,
        sameId: insertStartup.sameId || null,
        mediaUrls: insertStartup.mediaUrls || [],
        videoUrl: insertStartup.videoUrl || null
      };
      
      await db.collection(STARTUPS_COLLECTION).insertOne(startup);
      
      // If we have a founder ID, also store in startup wallet collection for reliable lookup
      if (startup.founderId) {
        try {
          const user = await this.getUser(Number(startup.founderId));
          if (user && user.walletAddress) {
            console.log(`[mongo-storage] Storing wallet address ${user.walletAddress} for new startup ID ${id} (founder: ${startup.founderId})`);
            await db.collection(STARTUP_WALLET_COLLECTION).updateOne(
              { startupId: id.toString() },
              { 
                $set: { 
                  startupId: id.toString(),
                  founderId: startup.founderId,
                  walletAddress: user.walletAddress.toLowerCase(),
                  dataSource: 'startup_creation',
                  updatedAt: now
                },
                $setOnInsert: { createdAt: now }
              },
              { upsert: true }
            );
          } else {
            console.log(`[mongo-storage] No wallet address found for founder ${startup.founderId} during startup creation`);
          }
        } catch (walletError) {
          // Log but don't throw error so startup creation can still succeed
          console.error(`[mongo-storage] Error storing startup wallet during creation:`, walletError);
        }
      }
      
      return startup;
    } catch (error) {
      console.error(`[mongo-storage] Error creating startup:`, error);
      throw error;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async updateStartup(id: number, startupData: Partial<Startup>): Promise<Startup | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      
      // Exclude id from the update
      const { id: _, ...updateData } = startupData;
      
      console.log(`[mongo-storage] Updating startup ${id} with data fields: ${Object.keys(updateData).join(', ')}`);
      
      const result = await db.collection(STARTUPS_COLLECTION).findOneAndUpdate(
        { id: Number(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      return result ? result as Startup : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error updating startup ${id}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }
  
  // Document operations
  async getDocument(id: number | string): Promise<Document | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const docId = typeof id === 'number' ? id : Number(id);
      const document = await db.collection(DOCUMENTS_COLLECTION).findOne({ id: docId });
      return document ? document as Document : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error getting document ${id}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async getDocumentsByStartupId(startupId: number | string): Promise<Document[]> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const startupIdStr = startupId.toString();
      const documents = await db.collection(DOCUMENTS_COLLECTION)
        .find({ startupId: startupIdStr })
        .toArray();
      return documents as Document[];
    } catch (error) {
      console.error(`[mongo-storage] Error getting documents by startup ID ${startupId}:`, error);
      return [];
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      
      // Get the next ID by counting documents
      const count = await db.collection(DOCUMENTS_COLLECTION).countDocuments();
      const id = count + 1;
      
      const now = new Date();
      const document: Document = {
        ...insertDocument,
        id,
        createdAt: now,
        fileId: insertDocument.fileId || null,
        fileName: insertDocument.fileName || null,
        mimeType: insertDocument.mimeType || null,
        fileSize: insertDocument.fileSize || null
      };
      
      console.log(`[mongo-storage] Creating new document "${document.name}" for startup ${document.startupId}`);
      await db.collection(DOCUMENTS_COLLECTION).insertOne(document);
      return document;
    } catch (error) {
      console.error(`[mongo-storage] Error creating document:`, error);
      throw error;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }
  
  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const transaction = await db.collection(TRANSACTIONS_COLLECTION).findOne({ id: Number(id) });
      return transaction ? transaction as Transaction : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error getting transaction ${id}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async getTransactionsByFounderId(founderId: number): Promise<Transaction[]> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const founderIdStr = founderId.toString();
      
      // First get all startups by this founder
      const startups = await this.getStartupsByFounderId(founderId);
      const startupIds = startups.map(s => s.id.toString());
      
      if (startupIds.length === 0) {
        return [];
      }
      
      // Then get all transactions for these startups
      const transactions = await db.collection(TRANSACTIONS_COLLECTION)
        .find({ startupId: { $in: startupIds } })
        .toArray();
      
      return transactions as Transaction[];
    } catch (error) {
      console.error(`[mongo-storage] Error getting transactions by founder ID ${founderId}:`, error);
      return [];
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async getTransactionsByInvestorId(investorId: number): Promise<Transaction[]> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const investorIdStr = investorId.toString();
      const transactions = await db.collection(TRANSACTIONS_COLLECTION)
        .find({ investorId: investorIdStr })
        .toArray();
      return transactions as Transaction[];
    } catch (error) {
      console.error(`[mongo-storage] Error getting transactions by investor ID ${investorId}:`, error);
      return [];
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      
      // Get the next ID by counting documents
      const count = await db.collection(TRANSACTIONS_COLLECTION).countDocuments();
      const id = count + 1;
      
      const now = new Date();
      const transaction: Transaction = {
        ...insertTransaction,
        id,
        createdAt: now,
        transactionId: insertTransaction.transactionId || null
      };
      
      console.log(`[mongo-storage] Creating new transaction for startup ${transaction.startupId}, investor ${transaction.investorId}, amount ${transaction.amount}`);
      await db.collection(TRANSACTIONS_COLLECTION).insertOne(transaction);
      
      // Update the startup's current funding if the transaction is completed
      if (transaction.status === 'completed') {
        const startupId = transaction.startupId;
        try {
          // Get current startup
          const startup = await this.getStartup(Number(startupId));
          if (startup) {
            // Calculate new funding amount
            const currentFunding = parseFloat(startup.currentFunding || '0');
            const amount = parseFloat(transaction.amount);
            const newFunding = currentFunding + amount;
            
            console.log(`[mongo-storage] Updating funding for startup ${startupId} from ${currentFunding} to ${newFunding}`);
            
            // Update startup with new funding amount
            await this.updateStartup(Number(startupId), {
              currentFunding: newFunding.toString()
            });
          } else {
            console.error(`[mongo-storage] Cannot update funding, startup ${startupId} not found`);
          }
        } catch (updateError) {
          console.error(`[mongo-storage] Non-critical error updating startup funding:`, updateError);
          // Don't fail the transaction if updating the startup fails
        }
      }
      
      return transaction;
    } catch (error) {
      console.error(`[mongo-storage] Error creating transaction:`, error);
      throw error;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async updateTransactionStatus(id: number, status: string): Promise<Transaction | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      
      console.log(`[mongo-storage] Updating transaction ${id} status to: ${status}`);
      
      const result = await db.collection(TRANSACTIONS_COLLECTION).findOneAndUpdate(
        { id: Number(id) },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      
      const transaction = result ? result as Transaction : undefined;
      
      // If status changed to completed, update the startup's funding
      if (transaction && status === 'completed') {
        const startupId = transaction.startupId;
        try {
          // Get current startup
          const startup = await this.getStartup(Number(startupId));
          if (startup) {
            // Calculate new funding amount
            const currentFunding = parseFloat(startup.currentFunding || '0');
            const amount = parseFloat(transaction.amount);
            const newFunding = currentFunding + amount;
            
            console.log(`[mongo-storage] Transaction completed - Updating funding for startup ${startupId} from ${currentFunding} to ${newFunding}`);
            
            // Update startup with new funding amount
            await this.updateStartup(Number(startupId), {
              currentFunding: newFunding.toString()
            });
          } else {
            console.error(`[mongo-storage] Cannot update funding, startup ${startupId} not found on transaction completion`);
          }
        } catch (updateError) {
          console.error(`[mongo-storage] Non-critical error updating startup funding:`, updateError);
          // Don't fail the transaction if updating the startup fails
        }
      }
      
      return transaction;
    } catch (error) {
      console.error(`[mongo-storage] Error updating transaction status ${id}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }
  
  // Chat operations
  async getChat(id: number): Promise<Chat | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const chat = await db.collection(CHATS_COLLECTION).findOne({ id: Number(id) });
      return chat ? chat as Chat : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error getting chat ${id}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async getChatsByFounderId(founderId: number): Promise<Chat[]> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const founderIdStr = founderId.toString();
      const chats = await db.collection(CHATS_COLLECTION)
        .find({ founderId: founderIdStr })
        .toArray();
      return chats as Chat[];
    } catch (error) {
      console.error(`[mongo-storage] Error getting chats by founder ID ${founderId}:`, error);
      return [];
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async getChatsByInvestorId(investorId: number): Promise<Chat[]> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const investorIdStr = investorId.toString();
      const chats = await db.collection(CHATS_COLLECTION)
        .find({ investorId: investorIdStr })
        .toArray();
      return chats as Chat[];
    } catch (error) {
      console.error(`[mongo-storage] Error getting chats by investor ID ${investorId}:`, error);
      return [];
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      
      // Get the next ID by counting documents
      const count = await db.collection(CHATS_COLLECTION).countDocuments();
      const id = count + 1;
      
      const now = new Date();
      const chat: Chat = { ...insertChat, id, createdAt: now };
      
      console.log(`[mongo-storage] Creating new chat between founder ${chat.founderId} and investor ${chat.investorId}`);
      await db.collection(CHATS_COLLECTION).insertOne(chat);
      return chat;
    } catch (error) {
      console.error(`[mongo-storage] Error creating chat:`, error);
      throw error;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }
  
  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const message = await db.collection(MESSAGES_COLLECTION).findOne({ id: Number(id) });
      return message ? message as Message : undefined;
    } catch (error) {
      console.error(`[mongo-storage] Error getting message ${id}:`, error);
      return undefined;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      const chatIdStr = chatId.toString();
      const messages = await db.collection(MESSAGES_COLLECTION)
        .find({ chatId: chatIdStr })
        .sort({ createdAt: 1 })
        .toArray();
      return messages as Message[];
    } catch (error) {
      console.error(`[mongo-storage] Error getting messages by chat ID ${chatId}:`, error);
      return [];
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    // Get a connection release function
    const releaseConnection = useMongoConnection();
    
    try {
      const db = getDB();
      
      // Get the next ID by counting documents
      const count = await db.collection(MESSAGES_COLLECTION).countDocuments();
      const id = count + 1;
      
      const now = new Date();
      const message: Message = { ...insertMessage, id, createdAt: now };
      
      console.log(`[mongo-storage] Creating new message in chat ${message.chatId} from ${message.senderId}`);
      await db.collection(MESSAGES_COLLECTION).insertOne(message);
      return message;
    } catch (error) {
      console.error(`[mongo-storage] Error creating message:`, error);
      throw error;
    } finally {
      // Always release the connection
      releaseConnection();
    }
  }
}