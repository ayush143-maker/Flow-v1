import { WebPlugin } from '@capacitor/core';
import type {
  EngineInfo,
  FlowCorePlugin,
  InsertResult,
  NotifListenerStatus,
  NotificationStats,
  ParserTestResult,
  PermissionStatus,
  SmsRequestResult,
  SmsSyncResult,
  TestNotificationResult,
} from './flow-core';

/**
 * Web fallback. It never pretends to be native — it reports honestly so the
 * UI can adapt (simulated permissions in the web preview, real on Android).
 * Store + SMS/notification methods are native-only; the web app uses the
 * Preferences backend instead.
 */
export class FlowCoreWeb extends WebPlugin implements FlowCorePlugin {
  async getEngineInfo(): Promise<EngineInfo> {
    return { native: false, platform: 'web', version: '0.0.0' };
  }

  async checkSmsPermission(): Promise<PermissionStatus> {
    return { granted: false };
  }

  async requestSmsPermission(): Promise<SmsRequestResult> {
    return { requested: false, granted: false };
  }

  async openNotificationSettings(): Promise<void> {
    /* No Android settings screens in the web preview. */
  }

  async isNotificationListenerEnabled(): Promise<NotifListenerStatus> {
    return { enabled: false };
  }

  async syncSms(): Promise<SmsSyncResult> {
    return { permissionGranted: false, scanned: 0, parsed: 0, inserted: 0, duplicates: 0 };
  }

  async generateTestSms(): Promise<InsertResult> {
    return { inserted: 0 };
  }

  async generateTestNotification(): Promise<TestNotificationResult> {
    return { inserted: 0, duplicates: 0 };
  }

  async getNotificationStats(): Promise<NotificationStats> {
    return {
      listenerEnabled: false,
      listenerBound: false,
      processingEnabled: false,
      notificationTransactions: 0,
    };
  }

  async requestNotificationRebind(): Promise<void> {
    /* Web preview has no notification listener. */
  }

  async runParserTests(): Promise<ParserTestResult> {
    return { total: 0, passed: 0, failures: [] };
  }

  private nativeOnly(method: string): Error {
    return new Error(`FlowCore.${method} is only available in the native Android app.`);
  }

  async getSnapshot(): Promise<never> {
    throw this.nativeOnly('getSnapshot');
  }

  async saveProfile(): Promise<never> {
    throw this.nativeOnly('saveProfile');
  }

  async setSettings(): Promise<never> {
    throw this.nativeOnly('setSettings');
  }

  async insertTransactions(): Promise<never> {
    throw this.nativeOnly('insertTransactions');
  }

  async applyCategory(): Promise<never> {
    throw this.nativeOnly('applyCategory');
  }

  async addCategory(): Promise<never> {
    throw this.nativeOnly('addCategory');
  }

  async updateCategory(): Promise<never> {
    throw this.nativeOnly('updateCategory');
  }

  async deleteCategory(): Promise<never> {
    throw this.nativeOnly('deleteCategory');
  }

  async deleteRule(): Promise<never> {
    throw this.nativeOnly('deleteRule');
  }

  async clearTestData(): Promise<never> {
    throw this.nativeOnly('clearTestData');
  }
}
