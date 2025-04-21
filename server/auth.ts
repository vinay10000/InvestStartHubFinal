import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { getDB, USERS_COLLECTION } from "./mongo";
import { connectToMongoDB } from "./mongo";
import { MongoClient } from "mongodb";
import MongoStore from "connect-mongo";

// Define types for express-session
declare module 'express-session' {
  interface SessionData {
    userId: number;
    passport: {
      user: number; // User ID
    };
  }
}

// Extend Express User type to include our user data
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Promisify scrypt for password hashing
const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt with salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compare a supplied password with a stored hash
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // Handle Firebase/Google Auth password format
  if (stored.startsWith('firebase_') || stored.startsWith('google_')) {
    return false;
  }
  
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Setup authentication middleware and routes
 */
export function setupAuth(app: Express) {
  console.log("Setting up authentication...");
  
  // Get MongoDB URI for session store
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/startup_investment_platform';
  
  // Configure session settings
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'development_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24 * 7, // 1 week
    })
  };

  // Set up session middleware
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up local authentication strategy
  passport.use(new LocalStrategy(
    { usernameField: 'username' },
    async (username, password, done) => {
      try {
        console.log(`Attempting authentication for user: ${username}`);
        
        // Check if username is an email
        const isEmail = username.includes('@');
        let user;
        
        if (isEmail) {
          console.log('Username is an email address');
          // Find by email or username
          user = await storage.getUserByUsername(username);
        } else {
          console.log('Username is not an email address');
          // Find by username only
          user = await storage.getUserByUsername(username);
        }
        
        // If user not found
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        // For Firebase users (password starts with firebase_ or google_)
        if (user.password.startsWith('firebase_') || user.password.startsWith('google_')) {
          console.log(`Found Firebase/Google user: ${username}. Firebase authentication is no longer supported.`);
          return done(null, false, { message: 'Firebase authentication is no longer supported. Please reset your password.' });
        }
        
        // Compare passwords
        const isPasswordValid = await comparePasswords(password, user.password);
        
        if (!isPasswordValid) {
          console.log(`Invalid password for user: ${username}`);
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        // Success
        console.log(`Authentication successful for user: ${username}`);
        return done(null, user);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    }
  ));

  // User serialization for the session
  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  // User deserialization from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.log(`User not found for ID: ${id}`);
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      console.error('Error deserializing user:', error);
      done(error, null);
    }
  });

  // Auth endpoints
  
  // Register endpoint
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Processing registration request:', JSON.stringify(req.body, null, 2));
      
      const { username, email, password, role, walletAddress } = req.body;
      
      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email and password are required' });
      }
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(username);
      const existingEmail = await storage.getUserByUsername(email);
      
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create the user with hashed password
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: role || 'investor',
        walletAddress: walletAddress || '',
        profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=256`
      });
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error('Error logging in new user:', err);
          return next(err);
        }
        
        // Return the user (without password)
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Login endpoint
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error('Authentication error:', err);
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error('Error during login:', err);
          return next(err);
        }
        
        // Return the user (without password)
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    console.log('Processing logout request');
    
    req.logout((err) => {
      if (err) {
        console.error('Error during logout:', err);
        return next(err);
      }
      
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).json({ message: 'Logout failed' });
        }
        
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
      });
    });
  });

  // Current user endpoint
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Return the authenticated user (without password)
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.status(200).json(userWithoutPassword);
  });
  
  // Password reset endpoints (TODO: implement these)
  app.post("/api/password/reset-request", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Find user by email
      const user = await storage.getUserByUsername(email);
      
      if (!user) {
        // Don't reveal that the user doesn't exist for security reasons
        return res.status(200).json({ message: 'If your email is registered, you will receive a password reset link' });
      }
      
      // Here you would generate a token and send an email
      // For now, we'll just return a success message
      
      res.status(200).json({ message: 'If your email is registered, you will receive a password reset link' });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });
  
  // Middleware to check if user is authenticated
  app.use('/api/auth-check', (req: Request, res: Response) => {
    res.status(200).json({
      authenticated: req.isAuthenticated(),
      user: req.isAuthenticated() ? req.user : null
    });
  });
  
  console.log("Authentication setup complete");
}

// Utility middleware for protecting routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: 'Authentication required' });
}

// Utility middleware for role-based access control
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = req.user as SelectUser;
    
    if (user.role !== role) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
}