import type { PaymentMethod } from '@/types';

export interface MerchantSpec {
  name: string;
  category: string;
  method: PaymentMethod;
  /** Average occurrences per month (randomised around this). */
  perMonth: number;
  minMinor: number;
  maxMinor: number;
  icon: string;
  credit?: boolean;
  /** Fixed day-of-month for recurring merchants. */
  recurringDay?: number;
  /** Exact amount for recurring merchants (paise). */
  fixedMinor?: number;
}

export const ACCOUNTS = {
  savings: { hint: 'A/c XX1234', bank: 'HDFC Bank', instrument: 'Savings A/c XX1234' },
  card: { hint: 'CC xx4321', bank: 'HDFC Bank', instrument: 'HDFC Credit Card x4321' },
} as const;

/** Realistic Indian spending mix — powers the demo dataset. */
export const MERCHANTS: MerchantSpec[] = [
  // Food
  { name: 'Swiggy', category: 'Food', method: 'upi', perMonth: 6, minMinor: 12000, maxMinor: 75000, icon: 'food' },
  { name: 'Zomato', category: 'Food', method: 'upi', perMonth: 3.5, minMinor: 15000, maxMinor: 90000, icon: 'food' },
  // Groceries
  { name: 'BigBasket', category: 'Groceries', method: 'upi', perMonth: 2, minMinor: 80000, maxMinor: 260000, icon: 'cart' },
  { name: 'Blinkit', category: 'Groceries', method: 'upi', perMonth: 3.5, minMinor: 15000, maxMinor: 90000, icon: 'cart' },
  { name: 'DMart', category: 'Groceries', method: 'card', perMonth: 0.8, minMinor: 90000, maxMinor: 320000, icon: 'store' },
  // Shopping
  { name: 'Amazon', category: 'Shopping', method: 'card', perMonth: 1.4, minMinor: 29900, maxMinor: 349900, icon: 'shopping' },
  { name: 'Flipkart', category: 'Shopping', method: 'card', perMonth: 0.6, minMinor: 39900, maxMinor: 299900, icon: 'shopping' },
  { name: 'Myntra', category: 'Shopping', method: 'card', perMonth: 0.3, minMinor: 69900, maxMinor: 249900, icon: 'shopping' },
  // Travel
  { name: 'Uber', category: 'Travel', method: 'upi', perMonth: 3, minMinor: 9000, maxMinor: 42000, icon: 'car' },
  { name: 'Ola', category: 'Travel', method: 'upi', perMonth: 1.5, minMinor: 8000, maxMinor: 35000, icon: 'car' },
  { name: 'IRCTC', category: 'Travel', method: 'netbanking', perMonth: 0.4, minMinor: 40000, maxMinor: 150000, icon: 'train' },
  { name: 'Indian Oil', category: 'Travel', method: 'card', perMonth: 1.4, minMinor: 150000, maxMinor: 300000, icon: 'fuel' },
  // Bills & utilities
  { name: 'Jio', category: 'Bills', method: 'upi', perMonth: 0, minMinor: 23900, maxMinor: 23900, icon: 'smartphone', recurringDay: 5, fixedMinor: 23900 },
  { name: 'Airtel', category: 'Bills', method: 'upi', perMonth: 0.8, minMinor: 19900, maxMinor: 39900, icon: 'smartphone' },
  { name: 'BSES Rajdhani', category: 'Bills', method: 'upi', perMonth: 0.9, minMinor: 70000, maxMinor: 160000, icon: 'zap' },
  // Subscriptions (fixed recurring)
  { name: 'Netflix', category: 'Subscriptions', method: 'card', perMonth: 0, minMinor: 64900, maxMinor: 64900, icon: 'tv', recurringDay: 14, fixedMinor: 64900 },
  { name: 'Spotify', category: 'Subscriptions', method: 'upi', perMonth: 0, minMinor: 11900, maxMinor: 11900, icon: 'music', recurringDay: 3, fixedMinor: 11900 },
  { name: 'YouTube Premium', category: 'Subscriptions', method: 'upi', perMonth: 0, minMinor: 14900, maxMinor: 14900, icon: 'play', recurringDay: 20, fixedMinor: 14900 },
  // Health
  { name: "Gold's Gym", category: 'Health', method: 'card', perMonth: 0, minMinor: 150000, maxMinor: 150000, icon: 'dumbbell', recurringDay: 1, fixedMinor: 150000 },
  { name: 'Apollo Pharmacy', category: 'Health', method: 'upi', perMonth: 0.9, minMinor: 15000, maxMinor: 120000, icon: 'pill' },
  // Entertainment
  { name: 'PVR Cinemas', category: 'Entertainment', method: 'card', perMonth: 0.7, minMinor: 30000, maxMinor: 90000, icon: 'film' },
  // Cash & transfers
  { name: 'ATM', category: 'Cash', method: 'atm', perMonth: 1.6, minMinor: 50000, maxMinor: 300000, icon: 'cash' },
  { name: 'UPI Transfer', category: 'Transfers', method: 'upi', perMonth: 2, minMinor: 10000, maxMinor: 200000, icon: 'transfers' },
  // Credits
  { name: 'Salary Credit', category: 'Transfers', method: 'bank_transfer', perMonth: 0, minMinor: 8450000, maxMinor: 8450000, icon: 'briefcase', credit: true, recurringDay: 1, fixedMinor: 8450000 },
  { name: 'Amazon Refund', category: 'Shopping', method: 'card', perMonth: 0.35, minMinor: 20000, maxMinor: 150000, icon: 'refund', credit: true },
  { name: 'PhonePe Cashback', category: 'Transfers', method: 'wallet', perMonth: 0.6, minMinor: 2000, maxMinor: 20000, icon: 'wallet', credit: true },
  { name: 'IMPS Credit', category: 'Transfers', method: 'bank_transfer', perMonth: 0.5, minMinor: 50000, maxMinor: 300000, icon: 'landmark', credit: true },
];
