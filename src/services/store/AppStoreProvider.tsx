import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  createBackend,
  DEFAULT_SETTINGS,
  migrateLegacyPreferences,
  type StoreBackend,
} from './backends';
import { generateMockTransactions, generateTestTransactions } from '@/services/mock/generate';
import type { StoreSnapshot } from '@/services/native/flow-core';
import type { AppSettings, Profile } from '@/types';

export { normalizeMerchant } from '@/utils/format';

const EMPTY_SNAPSHOT: StoreSnapshot = {
  profile: null,
  settings: { ...DEFAULT_SETTINGS },
  categories: [],
  rules: [],
  transactions: [],
  totalTransactions: 0,
  truncated: false,
};

export interface AppStore {
  ready: boolean;
  profile: Profile | null;
  transactions: StoreSnapshot['transactions'];
  categories: StoreSnapshot['categories'];
  rules: StoreSnapshot['rules'];
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
  const backend = useMemo<StoreBackend>(() => createBackend(), []);
  const [ready, setReady] = useState(false);
  const [snap, setSnap] = useState<StoreSnapshot>(EMPTY_SNAPSHOT);
  const snapRef = useRef(snap);
  snapRef.current = snap;

  // Boot: migrate old Preferences data (native), load the snapshot and seed
  // demo transactions when the store is empty (first launch).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await migrateLegacyPreferences(backend);
        let loaded = await backend.loadSnapshot();
        if (loaded.transactions.length === 0) {
          await backend.insertTransactions(generateMockTransactions(), 'replaceAll');
          loaded = await backend.loadSnapshot();
        }
        if (!cancelled) {
          setSnap(loaded);
          setReady(true);
        }
      } catch (err) {
        console.error('[Flow] store init failed', err);
        if (!cancelled) setReady(true); // app still renders with empty states
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backend]);

  const refresh = useCallback(async () => {
    try {
      setSnap(await backend.loadSnapshot());
    } catch (err) {
      console.error('[Flow] refresh failed', err);
    }
  }, [backend]);

  /** Run a backend mutation, then re-load the snapshot (single code path). */
  const run = useCallback(
    (op: () => Promise<unknown>) => {
      void op()
        .then(() => refresh())
        .catch((err) => console.error('[Flow] mutation failed', err));
    },
    [refresh],
  );

  const patchSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      const next = { ...snapRef.current.settings, ...patch };
      setSnap((s) => ({ ...s, settings: next }));
      run(() => backend.setSettings(next));
    },
    [backend, run],
  );

  const saveProfile = useCallback(
    (name: string) => {
      const clean = name.trim();
      setSnap((s) => ({
        ...s,
        profile: { name: clean, createdAt: s.profile?.createdAt ?? new Date().toISOString() },
      }));
      run(() => backend.saveProfile(clean));
    },
    [backend, run],
  );

  const finishOnboarding = useCallback(() => {
    patchSettings({ onboarded: true });
  }, [patchSettings]);

  const updateName = useCallback(
    (name: string) => saveProfile(name),
    [saveProfile],
  );

  const setSmsGranted = useCallback(
    (v: boolean) => patchSettings({ smsGranted: v }),
    [patchSettings],
  );

  const setNotificationsEnabled = useCallback(
    (v: boolean) => patchSettings({ notificationsEnabled: v }),
    [patchSettings],
  );

  const setAppLock = useCallback(
    (enabled: boolean, pinHash: string | null) =>
      patchSettings({ appLockEnabled: enabled, pinHash }),
    [patchSettings],
  );

  const applyCategory = useCallback(
    (txnId: string, category: string) => {
      const txn = snapRef.current.transactions.find((t) => t.id === txnId);
      if (txn) {
        setSnap((s) => ({
          ...s,
          transactions: s.transactions.map((t) =>
            t.merchantNormalized === txn.merchantNormalized ? { ...t, category } : t,
          ),
        }));
      }
      run(() => backend.applyCategory(txnId, category));
    },
    [backend, run],
  );

  const deleteRule = useCallback(
    (id: string) => {
      setSnap((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) }));
      run(() => backend.deleteRule(id));
    },
    [backend, run],
  );

  const addCategory = useCallback(
    (name: string, icon: string, color: string) => {
      const clean = name.trim();
      if (
        !clean ||
        snapRef.current.categories.some((c) => c.name.toLowerCase() === clean.toLowerCase())
      ) {
        return false;
      }
      setSnap((s) => ({
        ...s,
        categories: [
          ...s.categories,
          {
            id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
            name: clean,
            icon,
            color,
            isCustom: true,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      run(() => backend.addCategory(clean, icon, color));
      return true;
    },
    [backend, run],
  );

  const updateCategory = useCallback(
    (id: string, patch: { name?: string; icon?: string; color?: string }) => {
      const cat = snapRef.current.categories.find((c) => c.id === id);
      if (!cat) return;
      const name = patch.name?.trim() || cat.name;
      if (
        name !== cat.name &&
        snapRef.current.categories.some(
          (c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        return;
      }
      setSnap((s) => ({
        ...s,
        categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch, name } : c)),
        transactions:
          name !== cat.name
            ? s.transactions.map((t) =>
                t.category === cat.name ? { ...t, category: name } : t,
              )
            : s.transactions,
        rules:
          name !== cat.name
            ? s.rules.map((r) => (r.category === cat.name ? { ...r, category: name } : r))
            : s.rules,
      }));
      run(() => backend.updateCategory(id, { ...patch, name }));
    },
    [backend, run],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      const cat = snapRef.current.categories.find((c) => c.id === id);
      if (!cat || !cat.isCustom) return;
      setSnap((s) => ({
        ...s,
        categories: s.categories.filter((c) => c.id !== id),
        transactions: s.transactions.map((t) =>
          t.category === cat.name ? { ...t, category: 'Others' } : t,
        ),
        rules: s.rules.map((r) => (r.category === cat.name ? { ...r, category: 'Others' } : r)),
      }));
      run(() => backend.deleteCategory(id));
    },
    [backend, run],
  );

  const addTestTransactions = useCallback(() => {
    run(() =>
      backend.insertTransactions(generateTestTransactions(50, snapRef.current.rules), 'append'),
    );
  }, [backend, run]);

  const clearTestData = useCallback(() => {
    setSnap((s) => ({ ...s, transactions: s.transactions.filter((t) => !t.isTestData) }));
    run(() => backend.clearTestData());
  }, [backend, run]);

  const resetDemoData = useCallback(() => {
    run(() =>
      backend.insertTransactions(
        generateMockTransactions(120, Date.now() % 100000, snapRef.current.rules),
        'replaceAll',
      ),
    );
  }, [backend, run]);

  const value: AppStore = {
    ready,
    profile: snap.profile,
    transactions: snap.transactions,
    categories: snap.categories,
    rules: snap.rules,
    settings: snap.settings,
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
