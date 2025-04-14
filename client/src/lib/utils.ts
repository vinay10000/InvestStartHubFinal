import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function getInvestmentStageColor(stage: string): {bg: string, text: string} {
  switch (stage.toLowerCase()) {
    case 'pre-seed':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'seed':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'series a':
      return { bg: 'bg-purple-100', text: 'text-purple-800' };
    case 'series b':
      return { bg: 'bg-orange-100', text: 'text-orange-800' };
    case 'series c':
      return { bg: 'bg-pink-100', text: 'text-pink-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

export function getPaymentMethodColor(method: string): {bg: string, text: string} {
  switch (method.toLowerCase()) {
    case 'metamask':
      return { bg: 'bg-orange-100', text: 'text-orange-800' };
    case 'upi':
      return { bg: 'bg-teal-100', text: 'text-teal-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

export function getTransactionStatusColor(status: string): {bg: string, text: string} {
  switch (status.toLowerCase()) {
    case 'completed':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'pending':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'failed':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}
