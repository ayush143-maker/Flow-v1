import { Preferences } from '@capacitor/preferences';

export const KEYS = {
  profile: 'flow.profile',
  transactions: 'flow.transactions',
  categories: 'flow.categories',
  rules: 'flow.rules',
  settings: 'flow.settings',
} as const;

export async function loadJSON<T>(key: string): Promise<T | null> {
  const { value } = await Preferences.get({ key });
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) });
}
