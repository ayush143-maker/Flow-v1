import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { KEYS, loadJSON, saveJSON } from './persistence';
import { DEFAULT_CATEGORIES } from '@/theme/tokens';
import { generateMockTransactions, generateTestTransactions } from '@/services/mock/generate';
import { newId, normalizeMerchant } from '@/utils/format';
import type {
  AppSettings,
  Category,
  MerchantRule,
  Profile,
  Transaction,
} from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
  onboarded: false,
  smsGranted: false,
  notificationsEnabled: true,
  appLockEnabled: false,
  pinHash: null,
};

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

function usePersist<T>(enabled: boolean, key: string, value: T): void {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => {
      void saveJSON(key, value);
    }, 250);
    return () => window.clearTimeout(id);
  }, [enabled, key, value]);
}

export interface AppStore {
  ready: boolean;
  profile: Profile | null;
  transactions: Transaction[];
  categories: Category[];
  rules: MerchantRule[];
  settings: AppSettings;
  saveProfile(name: string): void;
  finishOnboarding(): void;
  updateName(name: string): void;
  setSmsGranted(v: boolean): void;
  setNotificationsEnabled(v: boolean): void;
  setAppLock(enabled: boolean, pinHash: string | null): void;
  applyCategory(txnId: string, category: string): void;
  deleteRule(id: string): void;
  addCategory(name: string, icon: string, color: string): boolean;
  updateCategory(id: string, patch: { name?: string; icon?: string; color?: string }): void;
  deleteCategory(id: string): void;
  addTestTransactions(): void;
  clearTestData(): void;
  resetDemoData(): void;
}

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [p, t, c, r, s] = await Promise.all([
        loadJSON<Profile>(KEYS.profile),
        loadJSON<Transaction[]>(KEYS.transactions),
        loadJSON<Category[]>(KEYS.categories),
        loadJSON<MerchantRule[]>(KEYS.rules),
        loadJSON<AppSettings>(KEYS.settings),
      ]);
      if (cancelled) return;
      setProfile(p);
      setCategories(c ?? defaultCategories());
      setSettings({ ...DEFAULT_SETTINGS, ...s });
      if (t && t.length > 0) {
        setTransactions(t);
        setRules(r ?? []);
      } else {
        const seeded = generateMockTransactions();
        setTransactions(seeded);
        setRules([]);
        void saveJSON(KEYS.transactions, seeded);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  usePersist(ready, KEYS.profile, profile);
  usePersist(ready, KEYS.transactions, transactions);
  usePersist(ready, KEYS.categories, categories);
  usePersist(ready, KEYS.rules, rules);
  usePersist(ready, KEYS.settings, settings);

  const saveProfile = useCallback((name: string) => {
    setProfile({ name: name.trim(), createdAt: new Date().toISOString() });
  }, []);

  const finishOnboarding = useCallback(() => {
    setSettings((s) => ({ ...s, onboarded: true }));
  }, []);

  const updateName = useCallback((name: string) => {
    setProfile((p) => (p ? { ...p, name: name.trim() } : p));
  }, []);

  const setSmsGranted = useCallback((v: boolean) => {
    setSettings((s) => ({ ...s, smsGranted: v }));
  }, []);

  const setNotificationsEnabled = useCallback((v: boolean) => {
    setSettings((s) => ({ ...s, notificationsEnabled: v }));
  }, []);

  const setAppLock = useCallback((enabled: boolean, pinHash: string | null) => {
    setSettings((s) => ({ ...s, appLockEnabled: enabled, pinHash }));
  }, []);

  const applyCategory = useCallback((txnId: string, category: string) => {
    setTransactions((prev) => {
      const txn = prev.find((t) => t.id === txnId);
      if (!txn || txn.category === category) return prev;
      const key = txn.merchantNormalized;
      return prev.map((t) =>
        t.merchantNormalized === key && t.category !== category ? { ...t, category } : t,
      );
    });
    setRules((prev) => {
      const txn = transactions.find((t) => t.id === txnId);
      if (!txn) return prev;
      const key = txn.merchantNormalized;
      const existing = prev.find((r) => r.merchantNormalized === key);
      const rule: MerchantRule = existing
        ? { ...existing, category, hitCount: existing.hitCount + 1, updatedAt: new Date().toISOString() }
        : {
            id: newId('r'),
            merchantNormalized: key,
            merchantDisplay: txn.merchant,
            category,
            hitCount: 1,
            updatedAt: new Date().toISOString(),
          };
      return [rule, ...prev.filter((r) => r.id !== rule.id)];
    });
  }, [transactions]);

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addCategory = useCallback(
    (name: string, icon: string, color: string): boolean => {
      const clean = name.trim();
      if (!clean) return false;
      if (categories.some((c) => c.name.toLowerCase() === clean.toLowerCase())) return false;
      setCategories((prev) => [
        ...prev,
        { id: newId('c'), name: clean, icon, color, isCustom: true, createdAt: new Date().toISOString() },
      ]);
      return true;
    },
    [categories],
  );

  const updateCategory = useCallback(
    (id: string, patch: { name?: string; icon?: string; color?: string }) => {
      const cat = categories.find((c) => c.id === id);
      if (!cat) return;
      const name = patch.name?.trim() || cat.name;
      if (
        name !== cat.name &&
        categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())
      ) {
        return;
      }
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch, name } : c)));
      if (name !== cat.name) {
        setTransactions((prev) =>
          prev.map((t) => (t.category === cat.name ? { ...t, category: name } : t)),
        );
        setRules((prev) => prev.map((r) => (r.category === cat.name ? { ...r, category: name } : r)));
      }
    },
    [categories],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      const cat = categories.find((c) => c.id === id);
      if (!cat || !cat.isCustom) return;
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setTransactions((prev) =>
        prev.map((t) => (t.category === cat.name ? { ...t, category: 'Others' } : t)),
      );
      setRules((prev) => prev.map((r) => (r.category === cat.name ? { ...r, category: 'Others' } : r)));
    },
    [categories],
  );

  const addTestTransactions = useCallback(() => {
    setTransactions((prev) => [...generateTestTransactions(50, rules), ...prev]);
  }, [rules]);

  const clearTestData = useCallback(() => {
    setTransactions((prev) => prev.filter((t) => !t.isTestData));
  }, []);

  const resetDemoData = useCallback(() => {
    setTransactions(generateMockTransactions(120, Date.now() % 100000, rules));
  }, [rules]);

  const value: AppStore = {
    ready,
    profile,
    transactions,
    categories,
    rules,
    settings,
    saveProfile,
    finishOnboarding,
    updateName,
    setSmsGranted,
    setNotificationsEnabled,
    setAppLock,
    applyCategory,
    deleteRule,
    addCategory,
    updateCategory,
    deleteCategory,
    addTestTransactions,
    clearTestData,
    resetDemoData,
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppStoreProvider');
  return ctx;
}

export { normalizeMerchant };
