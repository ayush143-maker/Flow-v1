/**
 * Flow — core domain types.
 *
 * Money is always stored as integer minor units (paise) to avoid
 * floating-point drift. Formatting to ₹ happens only at display time.
 */

export type TransactionType = 'debit' | 'credit';

export type TransactionSource = 'sms' | 'notification' | 'manual' | 'test';

export type PaymentMethod =
  | 'upi'
  | 'card'
  | 'netbanking'
  | 'atm'
  | 'wallet'
  | 'bank_transfer'
  | 'cash'
  | 'unknown';

export interface TransactionMetadata {
  bank?: string;
  instrument?: string;
  upiVpa?: string;
  extra?: Record<string, string>;
}

export interface Transaction {
  id: string;
  /** Amount in paise (₹1 = 100). */
  amountMinor: number;
  currency: 'INR';
  merchant: string;
  /** Uppercased, punctuation-stripped key used for rules & dedup. */
  merchantNormalized: string;
  category: string;
  type: TransactionType;
  source: TransactionSource;
  paymentMethod: PaymentMethod | null;
  accountHint: string | null;
  /** ISO 8601 timestamp of when the transaction occurred. */
  transactionDate: string;
  /** ISO 8601 timestamp of when Flow recorded it. */
  createdAt: string;
  originalMessage: string | null;
  /** Normalized fingerprint used for duplicate detection. */
  messageHash: string;
  referenceId: string | null;
  isTestData: boolean;
  metadata: TransactionMetadata | null;
}

export interface Category {
  id: string;
  name: string;
  /** Icon key resolved in src/components/icons.tsx. */
  icon: string;
  color: string;
  isCustom: boolean;
  createdAt: string;
}

/** Learned merchant → category mapping (user corrections persist here). */
export interface MerchantRule {
  id: string;
  merchantNormalized: string;
  merchantDisplay: string;
  category: string;
  hitCount: number;
  updatedAt: string;
}

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringPayment {
  id: string;
  merchant: string;
  amountMinor: number;
  frequency: RecurrenceFrequency;
  lastSeen: string;
  /** Null when there isn't enough evidence — estimates are always marked. */
  nextExpected: string | null;
  isEstimate: boolean;
}

export interface Profile {
  name: string;
  createdAt: string;
}

export interface AppSettings {
  onboarded: boolean;
  smsGranted: boolean;
  notificationsEnabled: boolean;
  appLockEnabled: boolean;
  pinHash: string | null;
}
