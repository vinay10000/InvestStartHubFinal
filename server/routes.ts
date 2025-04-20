import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express, { Request, Response } from 'express';
import { 
  insertUserSchema, insertStartupSchema, insertDocumentSchema, 
  insertTransactionSchema, insertChatSchema, insertMessageSchema,
  User, Transaction
} from '@shared/schema';
import { z } from 'zod';
import { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      // Get uid from request if it exists
      const { uid, ...restData } = req.body;
      
      // Add Firebase uid to password field as "firebase_{uid}" to track the association
      // This allows us to find users by Firebase UID later
      const userData = insertUserSchema.parse({
        ...restData,
        password: uid ? `firebase_${uid}_${restData.password}` : restData.password
      });

      const user = await storage.createUser(userData);
      res.status(201).json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Signup error:", error);
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
      
      // Check if user already exists with this Firebase UID
      const users = await storage.getAllUsers();
      let user = users.find((u: User) => u.password.includes(`firebase_${uid}`));
      
      if (!user) {
        // Try finding by email
        user = await storage.getUserByUsername(email);
      }
      
      if (!user) {
        // Create new user with Google credentials
        const newUser = {
          username: displayName || email.split('@')[0], // Use display name or extract username from email
          email,
          password: `firebase_${uid}_google`, // Special password format for Google Firebase users
          role: "investor", // Default role for Google sign-ins
          profilePicture: photoURL || "",
          walletAddress: "",
        };
        
        user = await storage.createUser(newUser);
        console.log('Created new user from Google auth:', email, 'with Firebase UID:', uid);
      } else if (!user.password.includes(`firebase_${uid}`)) {
        // Update existing user to include Firebase UID if it doesn't already have it
        const updatedUser = await storage.updateUser(user.id, {
          password: `firebase_${uid}_google`
        });
        
        if (updatedUser) {
          user = updatedUser;
          console.log('Updated existing user with Firebase UID:', uid);
        }
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
        // This is a Firebase UID, check if we have a user with password containing this UID
        const users = await storage.getAllUsers();
        
        // Look for either firebase_{uid}_ or google_{uid}
        user = users.find((u: User) => 
          u.password.includes(`firebase_${userId}`) || 
          u.password.includes(`google_${userId}`)
        );
        
        console.log('Looking for Firebase user with UID:', userId);
        
        if (!user) {
          console.log('Firebase user not found with UID:', userId);
          return res.status(404).json({ message: 'Firebase user not found' });
        }
        
        console.log('Found Firebase user:', user.username);
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
      console.log('Creating startup with data:', req.body);
      
      // Parse the request body with more error details
      try {
        const startupData = insertStartupSchema.parse(req.body);
        console.log('Startup data validated successfully:', startupData);
        const startup = await storage.createStartup(startupData);
        res.status(201).json({ startup });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error('Validation error:', validationError.errors);
          return res.status(400).json({ 
            message: 'Invalid startup data', 
            errors: validationError.errors 
          });
        }
        throw validationError; // Re-throw for the outer catch
      }
    } catch (error) {
      console.error('Error creating startup:', error);
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
      // Handle both numeric IDs and Firebase string IDs
      const startupIdParam = req.params.id;
      // Use the ID as is without trying to parse it - storage layer will handle it
      const startupId = startupIdParam;
      
      console.log(`Creating document for startup ID: ${startupId} (type: ${typeof startupId})`);
      
      const documentData = { ...req.body, startupId };
      const validatedData = insertDocumentSchema.parse(documentData);
      const document = await storage.createDocument(validatedData);
      res.status(201).json({ document });
    } catch (error) {
      console.error('Error creating document:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid document data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create document', error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/startups/:id/documents', async (req: Request, res: Response) => {
    try {
      // Handle both numeric IDs and Firebase string IDs
      const startupIdParam = req.params.id;
      // Use the ID as is without trying to parse it - storage layer will handle it
      const startupId = startupIdParam;
      
      console.log(`Getting documents for startup ID: ${startupId} (type: ${typeof startupId})`);
      
      const documents = await storage.getDocumentsByStartupId(startupId);
      res.status(200).json({ documents });
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents', error: error instanceof Error ? error.message : String(error) });
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
  
  // Initialize WebSocket server on the same HTTP server but using a specific path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections
  const connections = new Map<string, WebSocket>();
  
  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');
    
    // Generate unique connection ID
    const connectionId = Date.now().toString();
    connections.set(connectionId, ws);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection_established',
      connectionId,
      timestamp: Date.now()
    }));
    
    // Handle messages
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);
        
        // Handle different message types
        switch (data.type) {
          case 'chat_message':
            // Store message in database
            if (data.chatId && data.senderId && data.content) {
              try {
                const messageData = insertMessageSchema.parse({
                  chatId: parseInt(data.chatId),
                  senderId: parseInt(data.senderId),
                  content: data.content
                });
                
                const savedMessage = await storage.createMessage(messageData);
                
                // Broadcast to all connected clients
                connections.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                      type: 'new_message',
                      message: savedMessage,
                      timestamp: Date.now()
                    }));
                  }
                });
              } catch (error) {
                console.error('Error processing chat message:', error);
              }
            }
            break;
            
          case 'typing_indicator':
            // Broadcast typing indicator to all clients
            if (data.chatId && data.senderId) {
              connections.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'typing_indicator',
                    chatId: data.chatId,
                    senderId: data.senderId,
                    isTyping: data.isTyping,
                    timestamp: Date.now()
                  }));
                }
              });
            }
            break;
            
          case 'read_receipt':
            // Mark message as read and broadcast receipt
            if (data.messageId && data.userId) {
              connections.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'read_receipt',
                    messageId: data.messageId,
                    userId: data.userId,
                    timestamp: Date.now()
                  }));
                }
              });
            }
            break;
            
          case 'reaction':
            // Handle message reactions (add or remove)
            if (data.messageId && data.userId && data.emoji !== undefined) {
              connections.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'reaction',
                    messageId: data.messageId,
                    userId: data.userId,
                    emoji: data.emoji,
                    added: data.added,
                    chatId: data.chatId,
                    timestamp: Date.now()
                  }));
                }
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket connection closed:', connectionId);
      connections.delete(connectionId);
    });
  });
  
  return httpServer;
}
