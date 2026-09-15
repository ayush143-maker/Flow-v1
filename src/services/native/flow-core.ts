import { registerPlugin, type Plugin } from '@capacitor/core';
import type { AppSettings, Category, MerchantRule, Profile, Transaction } from '@/types';

/**
 * FlowCore — the single custom native plugin (Kotlin, android app module).
 * It owns SQLite storage (Phase 3), the SMS reader + parser (Phase 4), the
 * notification listener + cross-source dedup (Phase 5+6). Every method is
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

/** One SMS sync pass: inbox rows scanned vs transactions stored. */
export interface SmsSyncResult {
  permissionGranted: boolean;
  scanned: number;
  parsed: number;
  inserted: number;
  duplicates: number;
}

/** One notification test pass through the real ingestion pipeline. */
export interface TestNotificationResult {
  inserted: number;
  duplicates: number;
}

/** Live state of the notification pipeline. */
export interface NotificationStats {
  listenerEnabled: boolean;
  listenerBound: boolean;
  processingEnabled: boolean;
  notificationTransactions: number;
}

export interface ParserTestFailure {
  message: string;
  reason: string;
}

export interface ParserTestResult {
  total: number;
  passed: number;
  failures: ParserTestFailure[];
}

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

  syncSms(): Promise<SmsSyncResult>;
  generateTestSms(): Promise<InsertResult>;
  generateTestNotification(): Promise<TestNotificationResult>;
  getNotificationStats(): Promise<NotificationStats>;
  requestNotificationRebind(): Promise<void>;
  runParserTests(): Promise<ParserTestResult>;

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

export function syncSms(): Promise<SmsSyncResult> {
  return FlowCore.syncSms();
}

export function generateTestSms(): Promise<InsertResult> {
  return FlowCore.generateTestSms();
}

export function generateTestNotification(): Promise<TestNotificationResult> {
  return FlowCore.generateTestNotification();
}

export function getNotificationStats(): Promise<NotificationStats> {
  return FlowCore.getNotificationStats();
}

export function requestNotificationRebind(): Promise<void> {
  return FlowCore.requestNotificationRebind();
}

export function runParserTests(): Promise<ParserTestResult> {
  return FlowCore.runParserTests();
}
