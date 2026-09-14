import { WebPlugin } from '@capacitor/core';
import type { EngineInfo, FlowCorePlugin } from './flow-core';

/**
 * Web fallback. It never pretends to be native — it reports honestly so the
 * UI can adapt (mock data in the web preview, real data on Android).
 */
export class FlowCoreWeb extends WebPlugin implements FlowCorePlugin {
  async getEngineInfo(): Promise<EngineInfo> {
    return { native: false, platform: 'web', version: '0.0.0' };
  }
}
