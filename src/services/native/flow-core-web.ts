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
}
