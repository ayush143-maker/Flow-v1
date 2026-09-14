import { registerPlugin, type Plugin } from '@capacitor/core';
import type { AppSettings, Category, MerchantRule, Profile, Transaction } from '@/types';

/**
 * FlowCore — the single custom native plugin (Kotlin, android app module).
 * It owns SQLite storage (Phase 3), and later the SMS reader, the notification
 * listener, the transaction parser and duplicate detection. Every method is
 * typed here so the UI never guesses.
 */

export interface EngineInfo {
  native: boolean;
  platform: 'android' | 'web';
  version: string;
}

export interface PermissionStatus {
  granted: boolean;
}

export interface SmsRequestResult {
  requested: boolean;
  granted: boolean;
}

export interface NotifListenerStatus {
  enabled: boolean;
}

/** Full app state in one bridge call — the React store mirrors this. */
export interface StoreSnapshot {
  profile: Profile | null;
  settings: AppSettings;
  categories: Category[];
  rules: MerchantRule[];
  transactions: Transaction[];
  totalTransactions: number;
  truncated: boolean;
}

export interface InsertResult {
  inserted: number;
}

export interface AddCategoryResult {
  added: boolean;
}

export interface ClearTestDataResult {
  deleted: number;
}

export interface FlowCorePlugin extends Plugin {
  getEngineInfo(): Promise<EngineInfo>;
  checkSmsPermission(): Promise<PermissionStatus>;
  requestSmsPermission(): Promise<SmsRequestResult>;
  openNotificationSettings(): Promise<void>;
  isNotificationListenerEnabled(): Promise<NotifListenerStatus>;

  getSnapshot(): Promise<StoreSnapshot>;
  saveProfile(options: { name: string }): Promise<void>;
  setSettings(options: { settings: AppSettings }): Promise<void>;
  insertTransactions(options: {
    transactions: Transaction[];
    mode: 'append' | 'replaceAll';
  }): Promise<InsertResult>;
  applyCategory(options: { txnId: string; category: string }): Promise<void>;
  addCategory(options: { name: string; icon: string; color: string }): Promise<AddCategoryResult>;
  updateCategory(options: {
    id: string;
    name?: string;
    icon?: string;
    color?: string;
  }): Promise<void>;
  deleteCategory(options: { id: string }): Promise<void>;
  deleteRule(options: { id: string }): Promise<void>;
  clearTestData(): Promise<ClearTestDataResult>;
}

const FlowCore = registerPlugin<FlowCorePlugin>('FlowCore', {
  web: () => import('./flow-core-web').then((m) => new m.FlowCoreWeb()),
});

export { FlowCore };

export function getEngineInfo(): Promise<EngineInfo> {
  return FlowCore.getEngineInfo();
}

export async function checkSmsPermission(): Promise<boolean> {
  return (await FlowCore.checkSmsPermission()).granted;
}

export function requestSmsPermission(): Promise<SmsRequestResult> {
  return FlowCore.requestSmsPermission();
}

export function openNotificationSettings(): Promise<void> {
  return FlowCore.openNotificationSettings();
}

export async function isNotificationListenerEnabled(): Promise<boolean> {
  return (await FlowCore.isNotificationListenerEnabled()).enabled;
}
