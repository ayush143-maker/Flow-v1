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

export interface FlowCorePlugin extends Plugin {
  /** Health check — proves the native bridge is live. */
  getEngineInfo(): Promise<EngineInfo>;
}

const FlowCore = registerPlugin<FlowCorePlugin>('FlowCore', {
  web: () => import('./flow-core-web').then((m) => new m.FlowCoreWeb()),
});

export function getEngineInfo(): Promise<EngineInfo> {
  return FlowCore.getEngineInfo();
}
