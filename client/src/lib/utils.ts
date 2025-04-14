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
 */
export function getInvestmentStageColor(stage: string): string {
  const colorMap: Record<string, string> = {
    "seed": "emerald",
    "pre_seed": "green",
    "series_a": "blue",
    "series_b": "indigo",
    "series_c": "violet",
    "growth": "purple",
    "pre_ipo": "fuchsia",
  };
  
  return colorMap[stage.toLowerCase()] || "gray";
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