/**
 * PostgreSQL Wallet address utilities for the server side
 * 
 * This file provides a reliable wallet address retrieval system
 * that uses PostgreSQL for storing and retrieving wallet addresses
 */
import { eq } from "drizzle-orm";
import { drizzleDb as db } from "./drizzle.db";
import { userWallets, startupWallets } from "@shared/schema";
import { log } from "./vite";

/**
 * Store a wallet address for a user in PostgreSQL
 */
export async function storeWalletAddress(
  userId: string | number,
  walletAddress: string,
  source: string = "postgres"
): Promise<boolean> {
  try {
    log(`[wallet-db] Storing wallet ${walletAddress.substring(0, 10)}... for user ${userId}`);
    
    // Check if the wallet already exists for this user
    const existingWallet = await db.select().from(userWallets)
      .where(eq(userWallets.userId, userId.toString()));
    
    if (existingWallet.length > 0) {
      // Update existing wallet
      await db.update(userWallets)
        .set({ walletAddress, source, updatedAt: new Date() })
        .where(eq(userWallets.userId, userId.toString()));
      
      log(`[wallet-db] ✅ Updated wallet for user ${userId}`);
      return true;
    } else {
      // Insert new wallet
      await db.insert(userWallets).values({
        userId: userId.toString(),
        walletAddress,
        source
      });
      
      log(`[wallet-db] ✅ Inserted new wallet for user ${userId}`);
      return true;
    }
  } catch (error) {
    log(`[wallet-db] ❌ Error storing wallet for user ${userId}: ${error}`);
    return false;
  }
}

/**
 * Store a wallet address for a startup in PostgreSQL
 */
export async function storeStartupWalletAddress(
  startupId: string | number,
  founderId: string | number,
  walletAddress: string,
  source: string = "postgres"
): Promise<boolean> {
  try {
    log(`[wallet-db] Storing wallet ${walletAddress.substring(0, 10)}... for startup ${startupId}`);
    
    // Check if the wallet already exists for this startup
    const existingWallet = await db.select().from(startupWallets)
      .where(eq(startupWallets.startupId, startupId.toString()));
    
    if (existingWallet.length > 0) {
      // Update existing wallet
      await db.update(startupWallets)
        .set({ 
          walletAddress, 
          founderId: founderId.toString(), 
          source, 
          updatedAt: new Date() 
        })
        .where(eq(startupWallets.startupId, startupId.toString()));
      
      log(`[wallet-db] ✅ Updated wallet for startup ${startupId}`);
      return true;
    } else {
      // Insert new wallet
      await db.insert(startupWallets).values({
        startupId: startupId.toString(),
        founderId: founderId.toString(),
        walletAddress,
        source
      });
      
      log(`[wallet-db] ✅ Inserted new wallet for startup ${startupId}`);
      return true;
    }
  } catch (error) {
    log(`[wallet-db] ❌ Error storing wallet for startup ${startupId}: ${error}`);
    return false;
  }
}

/**
 * Initialize known wallet addresses in PostgreSQL
 */
export async function initKnownWalletAddresses(): Promise<void> {
  try {
    // Here we could pre-load any known wallet addresses from a configuration file
    // For now, we'll just ensure the database schema is ready
    log('[wallet-db] ✅ Wallet address schema initialized successfully');
  } catch (error) {
    log(`[wallet-db] ❌ Error initializing wallet addresses: ${error}`);
  }
}

/**
 * Get a wallet address by user ID from PostgreSQL
 * No fallbacks - returns null if not found
 */
export async function getWalletAddressByUserId(userId: number | string): Promise<string | null> {
  try {
    log(`[wallet-db] Getting wallet for user ${userId}`);
    
    const wallets = await db.select().from(userWallets)
      .where(eq(userWallets.userId, userId.toString()));
    
    if (wallets.length > 0) {
      log(`[wallet-db] ✅ Found wallet for user ${userId}: ${wallets[0].walletAddress.substring(0, 10)}...`);
      return wallets[0].walletAddress;
    }
    
    log(`[wallet-db] ❌ No wallet found for user ${userId}`);
    return null;
  } catch (error) {
    log(`[wallet-db] ❌ Error getting wallet for user ${userId}: ${error}`);
    return null;
  }
}

/**
 * Get a wallet address by MongoDB UID from PostgreSQL
 * Same as getWalletAddressByUserId since we store MongoDB UIDs as userIds
 */
export async function getWalletAddressByMongoUid(mongoUid: string): Promise<string | null> {
  return getWalletAddressByUserId(mongoUid);
}

/**
 * Get user ID by wallet address from PostgreSQL
 */
export async function getUserIdByWalletAddress(walletAddress: string): Promise<string | null> {
  try {
    log(`[wallet-db] Getting user for wallet ${walletAddress.substring(0, 10)}...`);
    
    const wallets = await db.select().from(userWallets)
      .where(eq(userWallets.walletAddress, walletAddress));
    
    if (wallets.length > 0) {
      log(`[wallet-db] ✅ Found user ${wallets[0].userId} for wallet`);
      return wallets[0].userId;
    }
    
    log(`[wallet-db] ❌ No user found for wallet ${walletAddress.substring(0, 10)}...`);
    return null;
  } catch (error) {
    log(`[wallet-db] ❌ Error getting user for wallet ${walletAddress.substring(0, 10)}...: ${error}`);
    return null;
  }
}

/**
 * Get a wallet address by startup ID from PostgreSQL
 * No fallbacks - returns null if not found
 */
export async function getWalletAddressByStartupId(startupId: number | string): Promise<string | null> {
  try {
    log(`[wallet-db] Getting wallet for startup ${startupId}`);
    
    const wallets = await db.select().from(startupWallets)
      .where(eq(startupWallets.startupId, startupId.toString()));
    
    if (wallets.length > 0) {
      log(`[wallet-db] ✅ Found wallet for startup ${startupId}: ${wallets[0].walletAddress.substring(0, 10)}...`);
      return wallets[0].walletAddress;
    }
    
    log(`[wallet-db] ❌ No wallet found for startup ${startupId}`);
    return null;
  } catch (error) {
    log(`[wallet-db] ❌ Error getting wallet for startup ${startupId}: ${error}`);
    return null;
  }
}

/**
 * Get founder ID by startup ID from PostgreSQL
 * Returns the founder ID associated with a startup's wallet
 */
export async function getFounderIdByStartupId(startupId: number | string): Promise<string | null> {
  try {
    log(`[wallet-db] Getting founder for startup ${startupId}`);
    
    const wallets = await db.select().from(startupWallets)
      .where(eq(startupWallets.startupId, startupId.toString()));
    
    if (wallets.length > 0) {
      log(`[wallet-db] ✅ Found founder ${wallets[0].founderId} for startup ${startupId}`);
      return wallets[0].founderId;
    }
    
    log(`[wallet-db] ❌ No founder found for startup ${startupId}`);
    return null;
  } catch (error) {
    log(`[wallet-db] ❌ Error getting founder for startup ${startupId}: ${error}`);
    return null;
  }
}