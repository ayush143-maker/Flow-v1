import { registerPlugin, type Plugin } from '@capacitor/core';

/**
 * FlowCore — the single custom native plugin (Kotlin, android app module).
 * It owns SMS ingestion, the notification listener, the transaction parser,
 * duplicate detection and SQLite. Its method surface grows phase by phase;
 * every method is typed here so the UI never guesses.
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

export interface FlowCorePlugin extends Plugin {
  /** Health check — proves the native bridge is live. */
  getEngineInfo(): Promise<EngineInfo>;
  /** Live READ_SMS state (polled after system dialogs / resume). */
  checkSmsPermission(): Promise<PermissionStatus>;
  /** Opens the Android runtime permission dialog for SMS. */
  requestSmsPermission(): Promise<SmsRequestResult>;
  /** Opens the special-access Notification access screen in Settings. */
  openNotificationSettings(): Promise<void>;
  /** Whether the user enabled our notification listener. */
  isNotificationListenerEnabled(): Promise<NotifListenerStatus>;
}

const FlowCore = registerPlugin<FlowCorePlugin>('FlowCore', {
  web: () => import('./flow-core-web').then((m) => new m.FlowCoreWeb()),
});

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
