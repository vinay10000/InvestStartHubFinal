import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express, { Request, Response, NextFunction } from 'express';
import { 
  insertUserSchema, insertStartupSchema, insertDocumentSchema, 
  insertTransactionSchema, insertChatSchema, insertMessageSchema,
  User, Transaction
} from '@shared/schema';
import { z } from 'zod';
import { WebSocketServer } from 'ws';
import { WebSocket } from 'ws';
import { setActiveConnections } from './imagekit';
import { 
  getWalletAddressByUserId, 
  getWalletAddressByStartupId,
  getWalletAddressByFirebaseUid,
  getUserIdByWalletAddress,
  storeWalletAddress,
  storeStartupWalletAddress
} from './wallet-utils';
import walletRoutes from './wallet-routes';
import { setupAuth, requireAuth, requireRole } from './auth';

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up MongoDB authentication with Passport
  setupAuth(app);
  
  // Register wallet routes at multiple endpoints for compatibility
  app.use('/api/wallet', walletRoutes); // New MongoDB-based endpoint
  app.use('/api/wallets', walletRoutes); // Standard endpoint that the frontend expects
  app.use('/api/mongodb/wallets', walletRoutes); // Keep this for backward compatibility
  
  // Legacy Auth routes - these will be replaced by the Passport-based authentication
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
      const { uid, email, displayName, photoURL, role } = req.body;
      
      if (!uid || !email) {
        return res.status(400).json({ message: 'User ID and email are required' });
      }
      
      // Generate a unique sameId for founders
      const sameId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      console.log('Generated sameId for new user:', sameId);
      
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
          role: role || "investor", // Use provided role or default to investor
          profilePicture: photoURL || "",
          walletAddress: "",
          // Add sameId for founders
          sameId: role === "founder" ? sameId : undefined
        };
        
        user = await storage.createUser(newUser);
        console.log('Created new user from Google auth:', email, 'with Firebase UID:', uid);
        
        // If this is a founder, we need to remember the sameId for later when they create startups
        if (role === "founder") {
          console.log('New founder created with sameId:', sameId);
        }
      } else if (!user.password.includes(`firebase_${uid}`)) {
        // Update existing user to include Firebase UID if it doesn't already have it
        // Also update the sameId if this is a founder and they don't have one yet
        const updates: Partial<User> = {
          password: `firebase_${uid}_google`
        };
        
        // Add sameId for founders if they don't have one yet
        if (role === "founder" && !user.sameId) {
          updates.sameId = sameId;
          console.log('Adding sameId to existing founder:', sameId);
        }
        
        const updatedUser = await storage.updateUser(user.id, updates);
        
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
      
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        return res.status(400).json({ message: 'Invalid wallet address format' });
      }
      
      console.log(`Connecting wallet ${walletAddress.substring(0, 10)}... to user ${userId}`);
      
      // Update wallet in both places - user record and dedicated wallet collection
      const user = await storage.updateUserWallet(userId, walletAddress);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Also store in dedicated wallet collection for reliable lookup
      await storeWalletAddress(userId, walletAddress);
      
      // If user is a founder, find their startups and store wallet for them too
      try {
        const founderStartups = await storage.getStartupsByFounderId(userId);
        if (founderStartups.length > 0) {
          console.log(`Found ${founderStartups.length} startups for founder ${userId}, updating their wallet addresses`);
          
          for (const startup of founderStartups) {
            await storeStartupWalletAddress(startup.id, userId, walletAddress);
            console.log(`Updated wallet for startup ${startup.id} to ${walletAddress.substring(0, 10)}...`);
          }
        }
      } catch (startupError) {
        console.error('Error updating startup wallets:', startupError);
        // Don't fail the whole operation if this part fails
      }
      
      res.status(200).json({ 
        user: { ...user, password: undefined },
        walletAddress
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      res.status(500).json({ message: 'Failed to connect wallet' });
    }
  });
  
  // New wallet address endpoints for MetaMask investment
  
  // Get wallet address for a user
  app.get('/api/wallets/user/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Try both methods of getting the wallet address for reliability
      const walletFromUtil = await getWalletAddressByUserId(userId);
      const user = await storage.getUser(userId);
      const walletFromUser = user?.walletAddress || null;
      
      // Use the one from the dedicated collection first, as it's more reliable
      const walletAddress = walletFromUtil || walletFromUser;
      
      // If the wallets don't match and both exist, sync them
      if (walletFromUtil && walletFromUser && walletFromUtil !== walletFromUser) {
        console.log(`Wallet address mismatch for user ${userId}, syncing...`);
        await storeWalletAddress(userId, walletFromUser);
      }
      
      if (!walletAddress) {
        return res.status(404).json({ 
          message: 'Wallet address not found',
          userId
        });
      }
      
      res.status(200).json({ 
        userId,
        walletAddress
      });
    } catch (error) {
      console.error('Error getting user wallet:', error);
      res.status(500).json({ message: 'Failed to get wallet address' });
    }
  });
  
  // Get wallet address for a startup
  app.get('/api/wallets/startup/:startupId', async (req: Request, res: Response) => {
    try {
      // Accept both numeric IDs and string IDs (for Firebase compatibility)
      const startupId = req.params.startupId;
      
      // Get the startup wallet from the dedicated collection
      const walletAddress = await getWalletAddressByStartupId(startupId);
      
      // If not found in dedicated collection, try to get the founder and their wallet
      if (!walletAddress) {
        // Check if the ID is numeric or a Firebase UID
        const isNumericId = !isNaN(Number(startupId));
        let startup = null;
        
        if (isNumericId) {
          // Try to get as numeric ID first
          startup = await storage.getStartup(Number(startupId));
        }
        
        if (!startup) {
          // Try as a Firebase ID as fallback
          startup = await storage.getStartupByFirebaseId(startupId);
        }
        
        if (!startup) {
          return res.status(404).json({ 
            message: 'Startup not found',
            startupId
          });
        }
        
        // Get founder's wallet - check if it's a Firebase UID or numeric ID
        const founderId = startup.founderId;
        let founderWallet = null;
        
        // Check if the founderId looks like a Firebase UID (non-numeric string)
        const isFirebaseUid = typeof founderId === 'string' && isNaN(Number(founderId)) && founderId.length > 10;
        
        if (isFirebaseUid) {
          console.log(`[routes] Detected Firebase UID as founderId: ${founderId}`);
          // Use the new Firebase UID specific method
          founderWallet = await getWalletAddressByFirebaseUid(founderId as string);
        } else {
          // Use the regular numeric ID method
          founderWallet = await getWalletAddressByUserId(founderId);
        }
        
        if (founderWallet) {
          // Store it for future quick lookups
          await storeStartupWalletAddress(startupId, founderId, founderWallet);
          
          return res.status(200).json({
            startupId,
            founderId,
            walletAddress: founderWallet,
            message: 'Using founder wallet address (now cached)'
          });
        }
        
        return res.status(404).json({ 
          message: 'Wallet address not found for startup or founder',
          startupId,
          founderId,
          isFirebaseUid
        });
      }
      
      res.status(200).json({ 
        startupId,
        walletAddress
      });
    } catch (error) {
      console.error('Error getting startup wallet:', error);
      res.status(500).json({ message: 'Failed to get wallet address' });
    }
  });
  
  // Find user by wallet address
  app.get('/api/wallets/address/:walletAddress', async (req: Request, res: Response) => {
    try {
      const walletAddress = req.params.walletAddress;
      
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        return res.status(400).json({ message: 'Invalid wallet address format' });
      }
      
      // Get user ID from the wallet address
      const userId = await getUserIdByWalletAddress(walletAddress);
      
      if (!userId) {
        return res.status(404).json({ 
          message: 'User not found for wallet address',
          walletAddress
        });
      }
      
      // Get full user details
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found despite wallet lookup success',
          userId,
          walletAddress
        });
      }
      
      res.status(200).json({ 
        user: { ...user, password: undefined },
        walletAddress
      });
    } catch (error) {
      console.error('Error finding user by wallet:', error);
      res.status(500).json({ message: 'Failed to find user by wallet address' });
    }
  });

  // Startup routes
  app.post('/api/startups', async (req: Request, res: Response) => {
    try {
      console.log('Creating startup with data:', req.body);
      
      // Generate a unique sameId to link founder and startup
      const sameId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      console.log('Generated sameId:', sameId);
      
      // Parse the request body with more error details
      try {
        // Add the sameId to the startup data
        const startupData = insertStartupSchema.parse({
          ...req.body,
          sameId: sameId
        });
        
        console.log('Startup data validated successfully:', startupData);
        const startup = await storage.createStartup(startupData);
        
        // Also update the founder's user record with the same sameId
        const founderId = parseInt(req.body.founderId);
        if (!isNaN(founderId)) {
          try {
            // Update the founder's user record with the sameId
            console.log('Updating founder with sameId:', founderId, sameId);
            const updatedUser = await storage.updateUser(founderId, { sameId });
            
            if (updatedUser) {
              console.log('Founder updated with sameId:', updatedUser.id);
            } else {
              console.warn('Could not update founder with sameId');
            }
          } catch (userUpdateError) {
            console.error('Error updating founder with sameId:', userUpdateError);
            // Don't fail the whole operation if this part fails
          }
        }
        
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
      // Accept both numeric IDs and string IDs (for Firebase compatibility)
      const startupIdParam = req.params.id;
      console.log(`Getting startup details for ID: ${startupIdParam} (type: ${typeof startupIdParam})`);
      
      // Check if the ID is numeric or a Firebase UID
      const isNumericId = !isNaN(Number(startupIdParam));
      let startup = null;
      
      if (isNumericId) {
        // Try to get as numeric ID first
        startup = await storage.getStartup(Number(startupIdParam));
      }
      
      if (!startup) {
        // Try as a Firebase ID as fallback
        startup = await storage.getStartupByFirebaseId(startupIdParam);
      }
      
      if (!startup) {
        return res.status(404).json({ 
          message: 'Startup not found',
          startupId: startupIdParam
        });
      }
      
      res.status(200).json({ startup });
    } catch (error) {
      console.error('Error fetching startup:', error);
      res.status(500).json({ message: 'Failed to fetch startup' });
    }
  });

  app.put('/api/startups/:id', async (req: Request, res: Response) => {
    try {
      // Accept both numeric IDs and string IDs (for Firebase compatibility)
      const startupIdParam = req.params.id;
      console.log(`Updating startup with ID: ${startupIdParam} (type: ${typeof startupIdParam})`);
      
      // Check if the ID is numeric or a Firebase UID
      const isNumericId = !isNaN(Number(startupIdParam));
      const startupId = isNumericId ? Number(startupIdParam) : startupIdParam;
      const startupData = req.body;
      
      // Try numeric update first for backward compatibility
      let updatedStartup = null;
      
      if (isNumericId) {
        updatedStartup = await storage.updateStartup(Number(startupId), startupData);
      }
      
      // If not found with numeric ID, try with string ID
      if (!updatedStartup && typeof startupIdParam === 'string') {
        // This will be implemented in storage class for Firebase compatibility 
        // using string IDs
        updatedStartup = await storage.updateStartup(startupIdParam, startupData);
      }
      
      if (!updatedStartup) {
        return res.status(404).json({ 
          message: 'Startup not found',
          startupId: startupIdParam
        });
      }
      
      res.status(200).json({ startup: updatedStartup });
    } catch (error) {
      console.error('Error updating startup:', error);
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
  
  // Get startup media files
  app.get('/api/startups/:id/media', async (req: Request, res: Response) => {
    try {
      // Handle both numeric IDs and Firebase string IDs
      const startupIdParam = req.params.id;
      const startupId = startupIdParam;
      
      console.log(`Getting media for startup ID: ${startupId} (type: ${typeof startupId})`);
      
      // This would typically fetch from a database table
      // For now, we'll return an empty array (media will be handled through Firebase/client-side)
      // In a real implementation, this would fetch from storage.getMediaByStartupId(startupId)
      res.status(200).json({ media: [] });
    } catch (error) {
      console.error('Error fetching media:', error);
      res.status(500).json({ message: 'Failed to fetch media', error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // In-memory storage for startup updates until we add it to the database model
  const startupUpdates: { id: string; startupId: string; title: string; content: string; category: string; createdAt: string }[] = [];
  
  // Get startup updates
  app.get('/api/startups/:id/updates', async (req: Request, res: Response) => {
    try {
      // Handle both numeric IDs and Firebase string IDs
      const startupIdParam = req.params.id;
      const startupId = startupIdParam;
      
      console.log(`Getting updates for startup ID: ${startupId} (type: ${typeof startupId})`);
      
      // Filter updates for this startup
      const updates = startupUpdates.filter(update => update.startupId === startupId);
      
      res.status(200).json({ updates });
    } catch (error) {
      console.error('Error fetching updates:', error);
      res.status(500).json({ message: 'Failed to fetch updates', error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Create startup update
  app.post('/api/startups/updates', async (req: Request, res: Response) => {
    try {
      const { startupId, title, content, category } = req.body;
      
      if (!startupId || !title || !content) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      console.log(`Creating update for startup ID: ${startupId}`);
      
      // Create new update
      const updateId = Date.now().toString();
      const update = {
        id: updateId,
        startupId,
        title,
        content,
        category: category || 'news',
        createdAt: new Date().toISOString()
      };
      
      // Store the update in our in-memory array
      startupUpdates.push(update);
      console.log(`Added update to memory storage. Total updates: ${startupUpdates.length}`);
      
      res.status(201).json({ update });
    } catch (error) {
      console.error('Error creating update:', error);
      res.status(500).json({ message: 'Failed to create update', error: error instanceof Error ? error.message : String(error) });
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
      const userIdParam = req.query.userId as string;
      const role = req.query.role as string;
      
      console.log(`Getting investments for user ID: ${userIdParam} with role: ${role}`);
      
      // Check if the ID is numeric or a Firebase UID
      const isNumericId = !isNaN(Number(userIdParam));
      const userId = isNumericId ? Number(userIdParam) : userIdParam;
      
      let transactions;
      if (role === 'founder') {
        if (isNumericId) {
          transactions = await storage.getTransactionsByFounderId(Number(userId));
        } else {
          // For Firebase UIDs (string IDs), we need a method that accepts string IDs
          // This will be implemented in the storage class
          transactions = await storage.getTransactionsByFounderId(userId as string);
        }
      } else {
        if (isNumericId) {
          transactions = await storage.getTransactionsByInvestorId(Number(userId));
        } else {
          // For Firebase UIDs (string IDs)
          transactions = await storage.getTransactionsByInvestorId(userId as string);
        }
      }
      
      res.status(200).json({ transactions });
    } catch (error) {
      console.error('Error fetching investments:', error);
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
      const userIdParam = req.query.userId as string;
      const role = req.query.role as string;
      
      console.log(`Getting chats for user ID: ${userIdParam} with role: ${role}`);
      
      // Check if the ID is numeric or a Firebase UID
      const isNumericId = !isNaN(Number(userIdParam));
      const userId = isNumericId ? Number(userIdParam) : userIdParam;
      
      let chats;
      if (role === 'founder') {
        if (isNumericId) {
          chats = await storage.getChatsByFounderId(Number(userId));
        } else {
          // For Firebase UIDs (string IDs), we need a method that accepts string IDs
          // This will be implemented in the storage class
          chats = await storage.getChatsByFounderId(userId as string);
        }
      } else {
        if (isNumericId) {
          chats = await storage.getChatsByInvestorId(Number(userId));
        } else {
          // For Firebase UIDs (string IDs)
          chats = await storage.getChatsByInvestorId(userId as string);
        }
      }
      
      res.status(200).json({ chats });
    } catch (error) {
      console.error('Error fetching chats:', error);
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
      const chatIdParam = req.params.id;
      
      console.log(`Getting messages for chat ID: ${chatIdParam}`);
      
      // Check if the ID is numeric or a Firebase UID
      const isNumericId = !isNaN(Number(chatIdParam));
      const chatId = isNumericId ? Number(chatIdParam) : chatIdParam;
      
      let messages;
      if (isNumericId) {
        messages = await storage.getMessagesByChatId(Number(chatId));
      } else {
        // For Firebase UIDs (string IDs), we'll need a method that accepts string IDs
        messages = await storage.getMessagesByChatId(chatId as string);
      }
      
      res.status(200).json({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/chats/:id/messages', async (req: Request, res: Response) => {
    try {
      const chatIdParam = req.params.id;
      
      console.log(`Creating message for chat ID: ${chatIdParam}`);
      
      // Check if the ID is numeric or a Firebase UID
      const isNumericId = !isNaN(Number(chatIdParam));
      const chatId = isNumericId ? Number(chatIdParam) : chatIdParam;
      
      const messageData = { ...req.body, chatId };
      const validatedData = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validatedData);
      
      res.status(201).json({ message });
    } catch (error) {
      console.error('Error creating message:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid message data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create message' });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server on the same HTTP server but using a specific path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Log when the WebSocket server is initialized
  console.log('WebSocket server initialized on path: /ws');
  
  // Store active connections
  const connections = new Map<string, WebSocket>();
  
  // Share connections with imagekit module
  setActiveConnections(connections);
  
  // Handle WebSocket error event
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
  
  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');
    
    // Add error handler for this connection
    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error);
    });
    
    // Add connection health check
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping(); // Send ping to keep connection alive
        console.log('Ping sent to client');
      }
    }, 30000); // 30 second interval
    
    // Clear interval when connection is closed
    ws.on('close', () => {
      clearInterval(pingInterval);
      console.log('WebSocket connection closed, ping interval cleared');
      
      // Remove from connections map
      connections.forEach((client, id) => {
        if (client === ws) {
          connections.delete(id);
          console.log(`Removed connection ${id} from active connections`);
        }
      });
    });
    
    // Generate unique connection ID
    const connectionId = Date.now().toString();
    connections.set(connectionId, ws);
    
    // Log active connections count
    console.log(`Active WebSocket connections: ${connections.size}`);
    
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
                // Handle both numeric IDs and string IDs (for Firebase UIDs)
                const chatIdParam = data.chatId;
                const senderIdParam = data.senderId;
                
                // Process chat ID
                const isChatIdNumeric = !isNaN(Number(chatIdParam));
                const chatId = isChatIdNumeric ? Number(chatIdParam) : chatIdParam;
                
                // Process sender ID
                const isSenderIdNumeric = !isNaN(Number(senderIdParam));
                const senderId = isSenderIdNumeric ? Number(senderIdParam) : senderIdParam;
                
                console.log(`WebSocket chat message - ChatID: ${chatId} (${typeof chatId}), SenderID: ${senderId} (${typeof senderId})`);
                
                const messageData = insertMessageSchema.parse({
                  chatId,
                  senderId,
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
                
                // Send error back to the sender
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'error',
                    source: 'chat_message',
                    message: error instanceof Error ? error.message : 'Unknown error processing chat message',
                    timestamp: Date.now()
                  }));
                }
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
            
          case 'wallet_update':
            // Handle wallet update notifications
            if (data.startupId && data.walletAddress) {
              console.log(`Broadcasting wallet update for startup ${data.startupId}: ${data.walletAddress}`);
              
              // Broadcast the wallet update to all connected clients
              connections.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'wallet_update_notification',
                    startupId: data.startupId,
                    walletAddress: data.walletAddress,
                    updated: true,
                    timestamp: Date.now()
                  }));
                }
              });
            }
            break;
            
          case 'wallet_diagnostics':
            // Handle wallet diagnostics requests
            if (data.startupId) {
              // Acknowledge receipt of diagnostics request
              ws.send(JSON.stringify({
                type: 'wallet_diagnostics_started',
                startupId: data.startupId,
                timestamp: Date.now()
              }));
              
              // This would typically call a function to run diagnostics
              // For now, we'll just simulate a response
              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'wallet_diagnostics_result',
                    startupId: data.startupId,
                    status: 'completed',
                    result: {
                      walletFound: Math.random() > 0.3, // Simulate success/failure
                      methodsAttempted: ['direct', 'sameId', 'founderLookup'],
                      timeElapsed: Math.floor(Math.random() * 1000) + 500
                    },
                    timestamp: Date.now()
                  }));
                }
              }, 1500); // Simulate processing time
            }
            break;
          
          case 'wallet_missing_notification':
            // Handle notification when investor tries to invest but founder wallet is missing
            if (data.startupId && data.investorId) {
              console.log(`Wallet missing notification for startup ${data.startupId} from investor ${data.investorId}`);
              
              // Broadcast to all connected clients
              connections.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'wallet_missing_notification',
                    startupId: data.startupId,
                    investorId: data.investorId,
                    startupName: data.startupName || '',
                    investorName: data.investorName || '',
                    message: 'An investor tried to invest in your startup but your wallet address is not connected.',
                    timestamp: Date.now()
                  }));
                }
              });
            }
            break;
            
          case 'ping':
            // Simple ping/pong to verify connection is alive
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        
        // Send error response
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error processing message',
            timestamp: Date.now()
          }));
        }
      }
    });
    
    // Note: The close event handler is already defined above with the pingInterval cleanup
  });
  
  return httpServer;
}
