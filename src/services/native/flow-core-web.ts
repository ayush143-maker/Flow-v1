import { WebPlugin } from '@capacitor/core';
import type {
  EngineInfo,
  FlowCorePlugin,
  NotifListenerStatus,
  PermissionStatus,
  SmsRequestResult,
} from './flow-core';

/**
 * Web fallback. It never pretends to be native — it reports honestly so the
 * UI can adapt (simulated permissions in the web preview, real on Android).
 * Store methods are native-only: the web app uses the Preferences backend
 * (src/services/store/backends.ts) instead.
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
