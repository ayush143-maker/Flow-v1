import { Capacitor } from '@capacitor/core';
import { FlowCore, type StoreSnapshot } from '@/services/native/flow-core';
import { KEYS, loadJSON, saveJSON } from './persistence';
import { DEFAULT_CATEGORIES } from '@/theme/tokens';
import { newId } from '@/utils/format';
import type { AppSettings, Category, MerchantRule, Profile, Transaction } from '@/types';

/**
 * Storage backends for the app store.
 *
 * Native (Android): FlowCore → SQLite — the real data store.
 * Web (preview): Capacitor Preferences — same semantics, no native code.
 *
 * The React store talks ONLY to this interface, so screens never know or
 * care where the data lives. Mutations are always followed by a fresh
 * loadSnapshot(), so both sides can never drift apart.
 */

export const DEFAULT_SETTINGS: AppSettings = {
  onboarded: false,
  smsGranted: false,
  notificationsEnabled: true,
  appLockEnabled: false,
  pinHash: null,
};

export interface StoreBackend {
  loadSnapshot(): Promise<StoreSnapshot>;
  saveProfile(name: string): Promise<void>;
  setSettings(settings: AppSettings): Promise<void>;
  insertTransactions(txns: Transaction[], mode: 'append' | 'replaceAll'): Promise<number>;
  applyCategory(txnId: string, category: string): Promise<void>;
  addCategory(name: string, icon: string, color: string): Promise<boolean>;
  updateCategory(
    id: string,
    patch: { name?: string; icon?: string; color?: string },
  ): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  deleteRule(id: string): Promise<void>;
  clearTestData(): Promise<void>;
}

// ------------------------------------------------------------------- native

function createNativeBackend(): StoreBackend {
  return {
    async loadSnapshot() {
      return FlowCore.getSnapshot();
    },
    async saveProfile(name) {
      await FlowCore.saveProfile({ name });
    },
    async setSettings(settings) {
      await FlowCore.setSettings({ settings });
    },
    async insertTransactions(txns, mode) {
      const result = await FlowCore.insertTransactions({ transactions: txns, mode });
      return result.inserted;
    },
    async applyCategory(txnId, category) {
      await FlowCore.applyCategory({ txnId, category });
    },
    async addCategory(name, icon, color) {
      const result = await FlowCore.addCategory({ name, icon, color });
      return result.added;
    },
    async updateCategory(id, patch) {
      await FlowCore.updateCategory({ id, ...patch });
    },
    async deleteCategory(id) {
      await FlowCore.deleteCategory({ id });
    },
    async deleteRule(id) {
      await FlowCore.deleteRule({ id });
    },
    async clearTestData() {
      await FlowCore.clearTestData();
    },
  };
}

// ---------------------------------------------------------------------- web

function defaultCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((c) => ({
    id: newId('c'),
    name: c.name,
    icon: c.icon,
    color: c.color,
    isCustom: false,
    createdAt: new Date().toISOString(),
  }));
}

class PreferencesBackend implements StoreBackend {
  private profile: Profile | null = null;
  private transactions: Transaction[] = [];
  private categories: Category[] = [];
  private rules: MerchantRule[] = [];
  private settings: AppSettings = { ...DEFAULT_SETTINGS };

  async loadSnapshot(): Promise<StoreSnapshot> {
    const [p, t, c, r, s] = await Promise.all([
      loadJSON<Profile>(KEYS.profile),
      loadJSON<Transaction[]>(KEYS.transactions),
      loadJSON<Category[]>(KEYS.categories),
      loadJSON<MerchantRule[]>(KEYS.rules),
      loadJSON<AppSettings>(KEYS.settings),
    ]);
    this.profile = p;
    this.categories = c ?? defaultCategories();
    this.settings = { ...DEFAULT_SETTINGS, ...s };
    this.rules = r ?? [];
    this.transactions = t ?? [];
    return this.snapshot();
  }

  private snapshot(): StoreSnapshot {
    return {
      profile: this.profile ? { ...this.profile } : null,
      settings: { ...this.settings },
      categories: this.categories.map((c) => ({ ...c })),
      rules: this.rules.map((r) => ({ ...r })),
      transactions: this.transactions.map((t) => ({ ...t })),
      totalTransactions: this.transactions.length,
      truncated: false,
    };
  }

  async saveProfile(name: string): Promise<void> {
    this.profile = { name, createdAt: this.profile?.createdAt ?? new Date().toISOString() };
    await saveJSON(KEYS.profile, this.profile);
  }

  async setSettings(settings: AppSettings): Promise<void> {
    this.settings = { ...settings };
    await saveJSON(KEYS.settings, this.settings);
  }

  async insertTransactions(txns: Transaction[], mode: 'append' | 'replaceAll'): Promise<number> {
    if (mode === 'replaceAll') this.transactions = [...txns];
    else this.transactions = [...txns, ...this.transactions];
    this.transactions.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
    await saveJSON(KEYS.transactions, this.transactions);
    return txns.length;
  }

  async applyCategory(txnId: string, category: string): Promise<void> {
    const txn = this.transactions.find((t) => t.id === txnId);
    if (!txn) return;
    const key = txn.merchantNormalized;
    this.transactions = this.transactions.map((t) =>
      t.merchantNormalized === key ? { ...t, category } : t,
    );
    const existing = this.rules.find((r) => r.merchantNormalized === key);
    if (existing) {
      this.rules = this.rules.map((r) =>
        r.merchantNormalized === key
          ? { ...r, category, hitCount: r.hitCount + 1, updatedAt: new Date().toISOString() }
          : r,
      );
    } else {
      this.rules = [
        {
          id: newId('r'),
          merchantNormalized: key,
          merchantDisplay: txn.merchant,
          category,
          hitCount: 1,
          updatedAt: new Date().toISOString(),
        },
        ...this.rules,
      ];
    }
    await saveJSON(KEYS.transactions, this.transactions);
    await saveJSON(KEYS.rules, this.rules);
  }

  async addCategory(name: string, icon: string, color: string): Promise<boolean> {
    const clean = name.trim();
    if (!clean) return false;
    if (this.categories.some((c) => c.name.toLowerCase() === clean.toLowerCase())) return false;
    this.categories = [
      ...this.categories,
      { id: newId('c'), name: clean, icon, color, isCustom: true, createdAt: new Date().toISOString() },
    ];
    await saveJSON(KEYS.categories, this.categories);
    return true;
  }

  async updateCategory(
    id: string,
    patch: { name?: string; icon?: string; color?: string },
  ): Promise<void> {
    const cat = this.categories.find((c) => c.id === id);
    if (!cat) return;
    const name = patch.name?.trim() || cat.name;
    if (
      name !== cat.name &&
      this.categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())
    ) {
      return;
    }
    this.categories = this.categories.map((c) => (c.id === id ? { ...c, ...patch, name } : c));
    if (name !== cat.name) {
      this.transactions = this.transactions.map((t) =>
        t.category === cat.name ? { ...t, category: name } : t,
      );
      this.rules = this.rules.map((r) =>
        r.category === cat.name ? { ...r, category: name } : r,
      );
      await saveJSON(KEYS.transactions, this.transactions);
      await saveJSON(KEYS.rules, this.rules);
    }
    await saveJSON(KEYS.categories, this.categories);
  }

  async deleteCategory(id: string): Promise<void> {
    const cat = this.categories.find((c) => c.id === id);
    if (!cat || !cat.isCustom) return;
    this.categories = this.categories.filter((c) => c.id !== id);
    this.transactions = this.transactions.map((t) =>
      t.category === cat.name ? { ...t, category: 'Others' } : t,
    );
    this.rules = this.rules.map((r) =>
      r.category === cat.name ? { ...r, category: 'Others' } : r,
    );
    await saveJSON(KEYS.categories, this.categories);
    await saveJSON(KEYS.transactions, this.transactions);
    await saveJSON(KEYS.rules, this.rules);
  }

  async deleteRule(id: string): Promise<void> {
    this.rules = this.rules.filter((r) => r.id !== id);
    await saveJSON(KEYS.rules, this.rules);
  }

  async clearTestData(): Promise<void> {
    this.transactions = this.transactions.filter((t) => !t.isTestData);
    await saveJSON(KEYS.transactions, this.transactions);
  }
}

// ------------------------------------------------------------------ factory

export function createBackend(): StoreBackend {
  return Capacitor.isNativePlatform() ? createNativeBackend() : new PreferencesBackend();
}

// ----------------------------------------------------------------- migration

const LEGACY_MIGRATED_KEY = 'flow.migrated';

/**
 * One-time migration from Phase 2 (Preferences storage) into SQLite.
 * Carries over the profile name and settings; transaction history is demo
 * data at this stage and simply re-seeds. Runs only on the native app.
 */
export async function migrateLegacyPreferences(backend: StoreBackend): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const done = await loadJSON<boolean>(LEGACY_MIGRATED_KEY);
  if (done) return;
  try {
    const snap = await backend.loadSnapshot();
    if (snap.profile === null) {
      const legacyProfile = await loadJSON<Profile>(KEYS.profile);
      const legacySettings = await loadJSON<AppSettings>(KEYS.settings);
      if (legacyProfile) await backend.saveProfile(legacyProfile.name);
      if (legacySettings) await backend.setSettings({ ...DEFAULT_SETTINGS, ...legacySettings });
    }
  } catch (err) {
    console.error('[Flow] legacy migration failed', err);
  }
  await saveJSON(LEGACY_MIGRATED_KEY, true);
}
