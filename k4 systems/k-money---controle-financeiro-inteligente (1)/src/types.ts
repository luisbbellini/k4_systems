import { Timestamp } from 'firebase/firestore';

export type TransactionType = 'expense' | 'income' | 'transfer';
export type AccountType = 'credit' | 'debit' | 'cash' | 'voucher';

export interface Transaction {
  id?: string;
  uid: string;
  type: TransactionType;
  amount: number;
  category: string;
  subcategory: string;
  accountId: string;
  accountType: AccountType;
  paymentMethodId?: string;
  date: Timestamp;
  description: string;
  toAccount?: string; // For transfers
  isRecurring?: boolean;
  recurringType?: 'fixed' | 'installment';
  installmentsCount?: number;
  installmentNumber?: number;
  isInfinite?: boolean;
  parentId?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface PaymentMethod {
  id?: string;
  uid: string;
  name: string;
  icon?: string;
  isDefault?: boolean;
}

export interface Category {
  id?: string;
  uid: string;
  name: string;
  subcategories: string[];
  isDefault?: boolean;
}

export interface Investment {
  id?: string;
  uid: string;
  name: string;
  type: string;
  amount: number;
  date: Timestamp;
  currentValuation?: number;
  purchaseDate?: Timestamp;
  purchasePrice?: number;
  ticker?: string;
}

export interface Goal {
  id?: string;
  uid: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Timestamp;
  createdAt: Timestamp;
}

export type BankAccountType = 'checking' | 'savings' | 'investment' | 'credit_card' | 'cash' | 'meal_voucher' | 'food_voucher';

export interface BankAccount {
  id?: string;
  uid: string;
  name: string;
  type: BankAccountType;
  balance: number;
  institution?: string;
  color?: string;
  createdAt?: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
