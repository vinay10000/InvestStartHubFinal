import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Startup profile table
export const startups = pgTable("startups", {
  id: serial("id").primaryKey(),
  founderId: integer("founder_id").notNull(),
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
  // Media fields
  mediaUrls: text("media_urls").array(), // For storing multiple image URLs
  videoUrl: text("video_url"), // For storing a single video URL
  createdAt: timestamp("created_at").defaultNow(),
});

// Document table for startup documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  startupId: integer("startup_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "pitch_deck", "financial_report", "investor_agreement", "risk_disclosure"
  fileUrl: text("file_url").notNull(),
  fileId: text("file_id"),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
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
  founderId: integer("founder_id").notNull(),
  investorId: integer("investor_id").notNull(),
  startupId: integer("startup_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages for chat
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStartup = z.infer<typeof insertStartupSchema>;
export type Startup = typeof startups.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
