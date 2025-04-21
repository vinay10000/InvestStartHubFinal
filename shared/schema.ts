import { pgTable, text, serial, integer, boolean, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table with role
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // "founder" or "investor"
  walletAddress: text("wallet_address"),
  profilePicture: text("profile_picture"),
  sameId: text("same_id"), // Added to link founders with their startups
  createdAt: timestamp("created_at").defaultNow(),
});

// Startup profile table
export const startups = pgTable("startups", {
  id: serial("id").primaryKey(),
  founderId: text("founder_id").notNull(), // Changed to text for Firebase compatibility
  name: text("name").notNull(),
  description: text("description").notNull(),
  pitch: text("pitch").notNull(),
  investmentStage: text("investment_stage").notNull(), // Pre-seed, Seed, Series A, etc.
  category: text("category"),
  fundingGoal: text("funding_goal").default("100000"),
  currentFunding: text("current_funding").default("0"),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url"),
  upiId: text("upi_id"),
  upiQrCode: text("upi_qr_code"),
  sameId: text("same_id"), // Added to link startups with their founders
  // Media fields
  mediaUrls: text("media_urls").array(), // For storing multiple image URLs
  videoUrl: text("video_url"), // For storing a single video URL
  createdAt: timestamp("created_at").defaultNow(),
});

// Document table for startup documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  startupId: text("startup_id").notNull(), // Changed to text for Firebase compatibility
  name: text("name").notNull(),
  type: text("type").notNull(), // "pitch_deck", "financial_report", "investor_agreement", "risk_disclosure"
  fileUrl: text("file_url").notNull(),
  fileId: text("file_id"),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Startup Media table for images and videos (separate from documents)
export const startupMedia = pgTable("startup_media", {
  id: serial("id").primaryKey(),
  startupId: text("startup_id").notNull(), // Firebase compatibility
  type: text("type").notNull(), // "image" or "video"
  title: text("title"),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileId: text("file_id"),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Startup Updates table for founder announcements
export const startupUpdates = pgTable("startup_updates", {
  id: serial("id").primaryKey(),
  startupId: text("startup_id").notNull(), // Firebase compatibility
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  imageFileId: text("image_file_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transaction table for investments
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  startupId: text("startup_id").notNull(), // Changed to text for Firebase compatibility
  investorId: text("investor_id").notNull(), // Changed to text for Firebase compatibility
  amount: text("amount").notNull(),
  paymentMethod: text("payment_method").notNull(), // "metamask" or "upi"
  transactionId: text("transaction_id"),
  status: text("status").notNull(), // "pending", "completed", "failed"
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat table for conversation between founders and investors
export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  founderId: text("founder_id").notNull(), // Changed to text for Firebase compatibility
  investorId: text("investor_id").notNull(), // Changed to text for Firebase compatibility
  startupId: text("startup_id").notNull(), // Changed to text for Firebase compatibility
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages for chat
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: text("chat_id").notNull(), // Changed to text for Firebase compatibility
  senderId: text("sender_id").notNull(), // Changed to text for Firebase compatibility
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User wallet addresses (reliable storage separate from user table)
export const userWallets = pgTable("user_wallets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // User ID (can be number or Firebase UID)
  walletAddress: text("wallet_address").notNull(),
  source: text("source").default("postgres"), // Where this wallet was originally stored
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    walletAddressIdx: unique("wallet_address_idx").on(table.walletAddress),
  };
});

// Startup wallet addresses (reliable storage separate from startup table)
export const startupWallets = pgTable("startup_wallets", {
  id: serial("id").primaryKey(),
  startupId: text("startup_id").notNull().unique(), // Startup ID (can be number or Firebase ID)
  founderId: text("founder_id").notNull(), // Founder ID who owns this wallet
  walletAddress: text("wallet_address").notNull(),
  source: text("source").default("postgres"), // Where this wallet was originally stored
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertStartupSchema = createInsertSchema(startups).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertStartupMediaSchema = createInsertSchema(startupMedia).omit({
  id: true,
  createdAt: true,
});

export const insertStartupUpdateSchema = createInsertSchema(startupUpdates).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertUserWalletSchema = createInsertSchema(userWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStartupWalletSchema = createInsertSchema(startupWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStartup = z.infer<typeof insertStartupSchema>;
export type Startup = typeof startups.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertStartupMedia = z.infer<typeof insertStartupMediaSchema>;
export type StartupMedia = typeof startupMedia.$inferSelect;

export type InsertStartupUpdate = z.infer<typeof insertStartupUpdateSchema>;
export type StartupUpdate = typeof startupUpdates.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;
export type UserWallet = typeof userWallets.$inferSelect;

export type InsertStartupWallet = z.infer<typeof insertStartupWalletSchema>;
export type StartupWallet = typeof startupWallets.$inferSelect;
