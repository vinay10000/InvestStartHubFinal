import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}
import { Transaction } from '@shared/schema';

export interface ReceiptData {
  transactionId: string;
  date: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  startupName: string;
  startupId: string;
  investorName: string;
  investorId: string;
  walletAddress?: string;
  upiId?: string;
  status: string;
}

/**
 * Converts a Transaction object to ReceiptData
 */
export const transactionToReceiptData = (
  transaction: Transaction, 
  startupName: string, 
  investorName: string
): ReceiptData => {
  // Parse amount to number from string (since our schema has amount as text)
  const amount = parseFloat(transaction.amount);
  
  return {
    transactionId: transaction.id.toString(),
    date: transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : new Date().toLocaleString(),
    amount,
    currency: 'INR', // Default currency
    paymentMethod: transaction.paymentMethod || 'UPI',
    startupName,
    startupId: transaction.startupId.toString(),
    investorName,
    investorId: transaction.investorId.toString(),
    // These may not be in the schema but are handled gracefully
    walletAddress: transaction.paymentMethod === 'metamask' ? transaction.transactionId || undefined : undefined,
    upiId: transaction.paymentMethod === 'upi' ? transaction.transactionId || undefined : undefined,
    status: transaction.status
  };
};

/**
 * Generates a PDF receipt for an investment transaction
 */
export const generateInvestmentReceipt = (receiptData: ReceiptData): jsPDF => {
  // Create a new PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add logo and header
  doc.setFontSize(20);
  doc.setTextColor(25, 89, 176); // Brand color
  const title = 'StartupConnect';
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, 20);

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(100);
  const subtitle = 'Investment Receipt';
  const subtitleWidth = doc.getTextWidth(subtitle);
  doc.text(subtitle, (pageWidth - subtitleWidth) / 2, 30);

  // Add receipt details
  doc.setFontSize(10);
  doc.setTextColor(0);
  
  // Transaction Info Table
  autoTable(doc, {
    head: [['Transaction Details', '']],
    body: [
      ['Transaction ID', receiptData.transactionId],
      ['Date', receiptData.date],
      ['Status', receiptData.status.toUpperCase()],
      ['Payment Method', receiptData.paymentMethod],
      ['Amount', `${receiptData.currency} ${receiptData.amount.toFixed(2)}`],
    ],
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [25, 89, 176], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 40 },
  });

  // Startup Info Table
  autoTable(doc, {
    head: [['Startup Information', '']],
    body: [
      ['Startup Name', receiptData.startupName],
      ['Startup ID', receiptData.startupId],
    ],
    startY: doc.lastAutoTable.finalY + 10,
    theme: 'grid',
    headStyles: { fillColor: [25, 89, 176], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 240, 240] },
  });

  // Investor Info Table
  autoTable(doc, {
    head: [['Investor Information', '']],
    body: [
      ['Investor Name', receiptData.investorName],
      ['Investor ID', receiptData.investorId],
      ...((receiptData.walletAddress) ? [['Wallet Address', receiptData.walletAddress]] : []),
      ...((receiptData.upiId) ? [['UPI ID', receiptData.upiId]] : []),
    ],
    startY: doc.lastAutoTable.finalY + 10,
    theme: 'grid',
    headStyles: { fillColor: [25, 89, 176], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 240, 240] },
  });

  // Terms and conditions section
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('This is an electronically generated receipt and does not require a signature.', 14, doc.lastAutoTable.finalY + 20);
  doc.text('For any queries related to this transaction, please contact support@startupconnect.com', 14, doc.lastAutoTable.finalY + 25);

  // Add current date at bottom
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);

  return doc;
};

/**
 * Generates and downloads a PDF receipt
 */
export const downloadInvestmentReceipt = (receiptData: ReceiptData): void => {
  const doc = generateInvestmentReceipt(receiptData);
  
  // Generate unique filename
  const filename = `receipt_${receiptData.transactionId}_${Date.now()}.pdf`;
  
  // Save the PDF
  doc.save(filename);
};