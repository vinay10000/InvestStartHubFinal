import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with Tailwind's merge utility
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Truncate an Ethereum address
 */
export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a date
 */
export function formatDate(date: Date | string | number): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string | number): string {
  if (!date) return "";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Convert bytes to human readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Convert investment stage to more readable format
 */
export function formatInvestmentStage(stage: string): string {
  const stageMap: Record<string, string> = {
    "seed": "Seed",
    "pre_seed": "Pre-Seed",
    "series_a": "Series A",
    "series_b": "Series B",
    "series_c": "Series C",
    "growth": "Growth",
    "pre_ipo": "Pre-IPO",
  };
  
  return stageMap[stage] || capitalize(stage.replace(/_/g, " "));
}

/**
 * Get the color for an investment stage
 * Returns an object with bg and text properties for styling
 */
export function getInvestmentStageColor(stage: string): { bg: string; text: string } {
  const colorMap: Record<string, { bg: string; text: string }> = {
    "seed": { bg: "bg-emerald-100", text: "text-emerald-800" },
    "pre_seed": { bg: "bg-green-100", text: "text-green-800" },
    "pre-seed": { bg: "bg-green-100", text: "text-green-800" },
    "series_a": { bg: "bg-blue-100", text: "text-blue-800" },
    "series_b": { bg: "bg-indigo-100", text: "text-indigo-800" },
    "series_c": { bg: "bg-violet-100", text: "text-violet-800" },
    "growth": { bg: "bg-purple-100", text: "text-purple-800" },
    "pre_ipo": { bg: "bg-fuchsia-100", text: "text-fuchsia-800" },
  };
  
  return colorMap[stage.toLowerCase()] || { bg: "bg-gray-100", text: "text-gray-800" };
}

/**
 * Get color for payment method
 */
export function getPaymentMethodColor(method: string): string {
  const colorMap: Record<string, string> = {
    "metamask": "orange",
    "upi": "green",
    "bank": "blue",
    "credit_card": "indigo",
  };
  
  return colorMap[method.toLowerCase()] || "gray";
}

/**
 * Get color for transaction status
 */
export function getTransactionStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    "completed": "green",
    "pending": "yellow",
    "failed": "red",
    "processing": "blue",
  };
  
  return colorMap[status.toLowerCase()] || "gray";
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Format a number with commas
 */
export function formatNumber(number: number): string {
  return new Intl.NumberFormat("en-US").format(number);
}