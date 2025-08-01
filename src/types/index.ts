// User related types
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  accountBalance: number;
}

// WebAuthn related types
export interface WebAuthnCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  createdAt: Date;
}

// Transaction related types
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type TransactionType = 'nfc' | 'transfer' | 'deposit' | 'withdrawal';

export interface Transaction {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  timestamp: Date;
  status: TransactionStatus;
  transactionType: TransactionType;
  description: string;
}

// NFC related types
export interface NFCPaymentData {
  receiverId: string;
  amount: number;
  description: string;
} 
