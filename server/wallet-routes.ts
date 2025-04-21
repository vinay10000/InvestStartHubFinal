import express from 'express';
import { Request, Response } from 'express';
import * as mongoWalletUtils from './mongo-wallet-utils';

const router = express.Router();

/**
 * Get wallet status (check if wallets exist in MongoDB)
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Check if we have wallets in MongoDB
    const walletsExist = await mongoWalletUtils.checkWalletsExist();
    return res.json({ walletsExist });
  } catch (error) {
    console.error(`[wallet-routes] Error checking wallet status:`, error);
    return res.status(500).json({ message: 'Error checking wallet status' });
  }
});

/**
 * Initialize wallet addresses in MongoDB
 * Useful during startup to ensure wallet data is in MongoDB
 */
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    // Initialize wallets in MongoDB
    const result = await mongoWalletUtils.initializeWalletAddresses();
    return res.json({ success: result });
  } catch (error) {
    console.error(`[wallet-routes] Error initializing wallets:`, error);
    return res.status(500).json({ message: 'Error initializing wallets' });
  }
});

/**
 * Get wallet address by user ID
 * Uses MongoDB exclusively
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  console.log(`[wallet-routes] Getting wallet address for user: ${userId}`);
  
  try {
    // Use MongoDB only
    const mongoWallet = await mongoWalletUtils.getWalletAddressByUserId(userId);
    if (mongoWallet) {
      console.log(`[wallet-routes] ✅ Found wallet for user ${userId} in MongoDB: ${mongoWallet}`);
      return res.json({ walletAddress: mongoWallet, source: 'mongodb' });
    }
    
    console.log(`[wallet-routes] ❌ No wallet found for user ${userId}`);
    return res.status(404).json({ message: 'Wallet not found' });
  } catch (error) {
    console.error(`[wallet-routes] Error getting wallet for user ${userId}:`, error);
    return res.status(500).json({ message: 'Error retrieving wallet' });
  }
});

/**
 * Get wallet address by startup ID
 * Uses MongoDB exclusively
 */
router.get('/startup/:startupId', async (req: Request, res: Response) => {
  const startupId = req.params.startupId;
  console.log(`[wallet-routes] Getting wallet address for startup: ${startupId}`);
  
  try {
    // Use MongoDB only
    const mongoWallet = await mongoWalletUtils.getWalletAddressByStartupId(startupId);
    if (mongoWallet) {
      console.log(`[wallet-routes] ✅ Found wallet for startup ${startupId} in MongoDB: ${mongoWallet}`);
      return res.json({ walletAddress: mongoWallet, source: 'mongodb' });
    }
    
    console.log(`[wallet-routes] ❌ No wallet found for startup ${startupId}`);
    return res.status(404).json({ message: 'Wallet not found' });
  } catch (error) {
    console.error(`[wallet-routes] Error getting wallet for startup ${startupId}:`, error);
    return res.status(500).json({ message: 'Error retrieving wallet' });
  }
});

/**
 * Get user ID by wallet address
 * Uses MongoDB exclusively
 */
router.get('/address/:walletAddress', async (req: Request, res: Response) => {
  const walletAddress = req.params.walletAddress;
  console.log(`[wallet-routes] Getting user for wallet address: ${walletAddress}`);
  
  try {
    // Use MongoDB only
    const mongoUserId = await mongoWalletUtils.getUserIdByWalletAddress(walletAddress);
    if (mongoUserId !== null) {
      console.log(`[wallet-routes] ✅ Found user ${mongoUserId} for wallet in MongoDB`);
      return res.json({ userId: mongoUserId, source: 'mongodb' });
    }
    
    console.log(`[wallet-routes] ❌ No user found for wallet ${walletAddress}`);
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    console.error(`[wallet-routes] Error getting user for wallet ${walletAddress}:`, error);
    return res.status(500).json({ message: 'Error retrieving user' });
  }
});

/**
 * Connect wallet to user or startup
 * Uses MongoDB exclusively
 */
router.post('/connect', async (req: Request, res: Response) => {
  const { userId, startupId, walletAddress } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ message: 'Wallet address is required' });
  }
  
  try {
    if (userId) {
      // Store wallet for user in MongoDB
      const result = await mongoWalletUtils.storeWalletAddress(userId, walletAddress);
      
      console.log(`[wallet-routes] Wallet connected for user ${userId}: MongoDB=${result}`);
      return res.json({ success: true, userId, walletAddress });
    }
    
    if (startupId) {
      // Store wallet for startup in MongoDB
      // We need founderId for proper association, but if not available, use startupId as placeholder
      const founderId = req.body.founderId || startupId;
      
      const result = await mongoWalletUtils.storeStartupWalletAddress(startupId, founderId, walletAddress);
      
      console.log(`[wallet-routes] Wallet connected for startup ${startupId}: MongoDB=${result}`);
      return res.json({ success: true, startupId, founderId, walletAddress });
    }
    
    return res.status(400).json({ message: 'Either userId or startupId is required' });
  } catch (error) {
    console.error(`[wallet-routes] Error connecting wallet:`, error);
    return res.status(500).json({ message: 'Error connecting wallet' });
  }
});

export default router;