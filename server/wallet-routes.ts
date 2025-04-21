import express from 'express';
import { Request, Response } from 'express';
import * as mongoWalletUtils from './mongo-wallet-utils';
import * as firestoreWalletUtils from './wallet-utils';

const router = express.Router();

/**
 * Get wallet address by user ID
 * First tries MongoDB, falls back to Firestore if no wallet found
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  console.log(`[wallet-routes] Getting wallet address for user: ${userId}`);
  
  try {
    // First try MongoDB
    const mongoWallet = await mongoWalletUtils.getWalletAddressByUserId(userId);
    if (mongoWallet) {
      console.log(`[wallet-routes] ✅ Found wallet for user ${userId} in MongoDB: ${mongoWallet}`);
      return res.json({ walletAddress: mongoWallet, source: 'mongodb' });
    }
    
    // If not found in MongoDB, try Firestore
    const firestoreWallet = await firestoreWalletUtils.getWalletAddressByUserId(userId);
    if (firestoreWallet) {
      console.log(`[wallet-routes] ✅ Found wallet for user ${userId} in Firestore: ${firestoreWallet}`);
      
      // Store in MongoDB for future lookups
      await mongoWalletUtils.storeWalletAddress(userId, firestoreWallet);
      
      return res.json({ walletAddress: firestoreWallet, source: 'firestore' });
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
 * First tries MongoDB, falls back to Firestore if no wallet found
 */
router.get('/startup/:startupId', async (req: Request, res: Response) => {
  const startupId = req.params.startupId;
  console.log(`[wallet-routes] Getting wallet address for startup: ${startupId}`);
  
  try {
    // First try MongoDB
    const mongoWallet = await mongoWalletUtils.getWalletAddressByStartupId(startupId);
    if (mongoWallet) {
      console.log(`[wallet-routes] ✅ Found wallet for startup ${startupId} in MongoDB: ${mongoWallet}`);
      return res.json({ walletAddress: mongoWallet, source: 'mongodb' });
    }
    
    // If not found in MongoDB, try Firestore
    const firestoreWallet = await firestoreWalletUtils.getWalletAddressByStartupId(startupId);
    if (firestoreWallet) {
      console.log(`[wallet-routes] ✅ Found wallet for startup ${startupId} in Firestore: ${firestoreWallet}`);
      
      // Store in MongoDB for future lookups
      // We don't have the founder ID here, but we can use the startup ID as a placeholder
      await mongoWalletUtils.storeStartupWalletAddress(startupId, startupId, firestoreWallet);
      
      return res.json({ walletAddress: firestoreWallet, source: 'firestore' });
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
 * First tries MongoDB, falls back to Firestore if no user found
 */
router.get('/address/:walletAddress', async (req: Request, res: Response) => {
  const walletAddress = req.params.walletAddress;
  console.log(`[wallet-routes] Getting user for wallet address: ${walletAddress}`);
  
  try {
    // First try MongoDB
    const mongoUserId = await mongoWalletUtils.getUserIdByWalletAddress(walletAddress);
    if (mongoUserId !== null) {
      console.log(`[wallet-routes] ✅ Found user ${mongoUserId} for wallet in MongoDB`);
      return res.json({ userId: mongoUserId, source: 'mongodb' });
    }
    
    // If not found in MongoDB, try Firestore
    const firestoreUserId = await firestoreWalletUtils.getUserIdByWalletAddress(walletAddress);
    if (firestoreUserId !== null) {
      console.log(`[wallet-routes] ✅ Found user ${firestoreUserId} for wallet in Firestore`);
      
      // Store in MongoDB for future lookups
      await mongoWalletUtils.storeWalletAddress(firestoreUserId, walletAddress);
      
      return res.json({ userId: firestoreUserId, source: 'firestore' });
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
 */
router.post('/connect', async (req: Request, res: Response) => {
  const { userId, startupId, walletAddress } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ message: 'Wallet address is required' });
  }
  
  try {
    if (userId) {
      // Store wallet for user in both MongoDB and Firestore
      const mongoResult = await mongoWalletUtils.storeWalletAddress(userId, walletAddress);
      const firestoreResult = await firestoreWalletUtils.storeWalletAddress(userId, walletAddress);
      
      console.log(`[wallet-routes] Wallet connected for user ${userId}: MongoDB=${mongoResult}, Firestore=${firestoreResult}`);
      return res.json({ success: true, userId, walletAddress });
    }
    
    if (startupId) {
      // Store wallet for startup in both MongoDB and Firestore
      // We need founderId for proper association, but if not available, use startupId as placeholder
      const founderId = req.body.founderId || startupId;
      
      const mongoResult = await mongoWalletUtils.storeStartupWalletAddress(startupId, founderId, walletAddress);
      const firestoreResult = await firestoreWalletUtils.storeStartupWalletAddress(startupId, founderId, walletAddress);
      
      console.log(`[wallet-routes] Wallet connected for startup ${startupId}: MongoDB=${mongoResult}, Firestore=${firestoreResult}`);
      return res.json({ success: true, startupId, founderId, walletAddress });
    }
    
    return res.status(400).json({ message: 'Either userId or startupId is required' });
  } catch (error) {
    console.error(`[wallet-routes] Error connecting wallet:`, error);
    return res.status(500).json({ message: 'Error connecting wallet' });
  }
});

export default router;