import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express, { Request, Response } from 'express';
import { 
  insertUserSchema, insertStartupSchema, insertDocumentSchema, 
  insertTransactionSchema, insertChatSchema, insertMessageSchema,
  User 
} from '@shared/schema';
import { z } from 'zod';

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json({ user: { ...user, password: undefined } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      res.status(200).json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ message: 'Failed to login' });
    }
  });
  
  // Google Authentication endpoint
  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const { uid, email, displayName, photoURL } = req.body;
      
      if (!uid || !email) {
        return res.status(400).json({ message: 'User ID and email are required' });
      }
      
      // Check if user already exists
      let user = await storage.getUserByUsername(email);
      
      if (!user) {
        // Create new user with Google credentials
        const newUser = {
          username: email, // Using email as unique username
          email,
          password: `google_${uid}`, // Special password format for Google users
          role: "investor", // Default role for Google sign-ins
          profilePicture: photoURL || "",
          walletAddress: "",
        };
        
        user = await storage.createUser(newUser);
        console.log('Created new user from Google auth:', email);
      }
      
      res.status(200).json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ message: 'Failed to authenticate with Google' });
    }
  });

  // User routes
  app.get('/api/user/profile', async (req: Request, res: Response) => {
    try {
      // Handle Firebase UID (string) or database user ID (number)
      const userId = req.query.userId as string;
      
      let user;
      // If userId looks like a Firebase UID (not a number)
      if (isNaN(Number(userId))) {
        // This is a Firebase UID, check if we have a user with email containing this UID
        // In a real app, you'd have a proper mapping from Firebase UID to your user
        const users = await storage.getAllUsers();
        user = users.find((u: User) => u.password.includes(userId)); // Check for "google_{uid}" pattern
        
        if (!user) {
          return res.status(404).json({ message: 'Firebase user not found' });
        }
      } else {
        // Regular numeric user ID from our database
        user = await storage.getUser(parseInt(userId));
        
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
      }
      
      res.status(200).json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  });

  app.put('/api/user/profile', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.body.id);
      const userData = req.body;
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(200).json({ user: { ...updatedUser, password: undefined } });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update user profile' });
    }
  });

  app.post('/api/user/wallet/connect', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.body.userId);
      const walletAddress = req.body.walletAddress;
      const user = await storage.updateUserWallet(userId, walletAddress);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(200).json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ message: 'Failed to connect wallet' });
    }
  });

  // Startup routes
  app.post('/api/startups', async (req: Request, res: Response) => {
    try {
      const startupData = insertStartupSchema.parse(req.body);
      const startup = await storage.createStartup(startupData);
      res.status(201).json({ startup });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid startup data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create startup' });
    }
  });

  app.get('/api/startups', async (_req: Request, res: Response) => {
    try {
      const startups = await storage.getAllStartups();
      res.status(200).json({ startups });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch startups' });
    }
  });

  app.get('/api/startups/:id', async (req: Request, res: Response) => {
    try {
      const startupId = parseInt(req.params.id);
      const startup = await storage.getStartup(startupId);
      
      if (!startup) {
        return res.status(404).json({ message: 'Startup not found' });
      }
      
      res.status(200).json({ startup });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch startup' });
    }
  });

  app.put('/api/startups/:id', async (req: Request, res: Response) => {
    try {
      const startupId = parseInt(req.params.id);
      const startupData = req.body;
      const updatedStartup = await storage.updateStartup(startupId, startupData);
      
      if (!updatedStartup) {
        return res.status(404).json({ message: 'Startup not found' });
      }
      
      res.status(200).json({ startup: updatedStartup });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update startup' });
    }
  });

  // Document routes
  app.post('/api/startups/:id/documents', async (req: Request, res: Response) => {
    try {
      const startupId = parseInt(req.params.id);
      const documentData = { ...req.body, startupId };
      const validatedData = insertDocumentSchema.parse(documentData);
      const document = await storage.createDocument(validatedData);
      res.status(201).json({ document });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid document data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create document' });
    }
  });

  app.get('/api/startups/:id/documents', async (req: Request, res: Response) => {
    try {
      const startupId = parseInt(req.params.id);
      const documents = await storage.getDocumentsByStartupId(startupId);
      res.status(200).json({ documents });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  // Investment/Transaction routes
  app.post('/api/investments', async (req: Request, res: Response) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json({ transaction });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid transaction data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create transaction' });
    }
  });

  app.get('/api/investments', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const role = req.query.role as string;
      
      let transactions;
      if (role === 'founder') {
        transactions = await storage.getTransactionsByFounderId(userId);
      } else {
        transactions = await storage.getTransactionsByInvestorId(userId);
      }
      
      res.status(200).json({ transactions });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch investments' });
    }
  });

  app.get('/api/investments/:id', async (req: Request, res: Response) => {
    try {
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      res.status(200).json({ transaction });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch transaction' });
    }
  });

  app.post('/api/investments/verify', async (req: Request, res: Response) => {
    try {
      const { transactionId, status } = req.body;
      const transaction = await storage.updateTransactionStatus(transactionId, status);
      
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      res.status(200).json({ transaction });
    } catch (error) {
      res.status(500).json({ message: 'Failed to verify transaction' });
    }
  });

  // Chat routes
  app.get('/api/chats', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const role = req.query.role as string;
      
      let chats;
      if (role === 'founder') {
        chats = await storage.getChatsByFounderId(userId);
      } else {
        chats = await storage.getChatsByInvestorId(userId);
      }
      
      res.status(200).json({ chats });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch chats' });
    }
  });

  app.post('/api/chats', async (req: Request, res: Response) => {
    try {
      const chatData = insertChatSchema.parse(req.body);
      const chat = await storage.createChat(chatData);
      res.status(201).json({ chat });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid chat data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create chat' });
    }
  });

  app.get('/api/chats/:id/messages', async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.id);
      const messages = await storage.getMessagesByChatId(chatId);
      res.status(200).json({ messages });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/chats/:id/messages', async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.id);
      const messageData = { ...req.body, chatId };
      const validatedData = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validatedData);
      res.status(201).json({ message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid message data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create message' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
