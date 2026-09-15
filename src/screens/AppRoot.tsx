import { useEffect, useState, type ReactNode } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Plus } from 'lucide-react';
import logoUrl from '@/assets/brand/logo.svg';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import type { Route, TabName } from '@/navigation/types';
import { BottomNavigation } from '@/components/BottomNavigation';
import { OnboardingFlow } from '@/screens/onboarding/OnboardingFlow';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { TransactionsScreen } from '@/screens/transactions/TransactionsScreen';
import { TransactionDetailScreen } from '@/screens/transactions/TransactionDetailScreen';
import { AddTransactionScreen } from '@/screens/transactions/AddTransactionScreen';
import { InsightsScreen } from '@/screens/insights/InsightsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { CategoriesScreen } from '@/screens/settings/CategoriesScreen';
import { MerchantRulesScreen } from '@/screens/settings/MerchantRulesScreen';
import { RecurringScreen } from '@/screens/settings/RecurringScreen';
import { DeveloperToolsScreen } from '@/screens/settings/DeveloperToolsScreen';
import { AppLockScreen } from '@/screens/settings/AppLockScreen';
import { LockGate } from '@/screens/shared/LockGate';
import { ComingSoonScreen } from '@/screens/shared/ComingSoonScreen';

const LIGHT_BG = '#F7F5F2';
const DARK_BG = '#0D0D0D';

function renderRoute(route: Route): ReactNode {
  switch (route.name) {
    case 'transaction':
      return <TransactionDetailScreen id={route.id} />;
    case 'add-transaction':
      return <AddTransactionScreen />;
    case 'categories':
      return <CategoriesScreen />;
    case 'merchant-rules':
      return <MerchantRulesScreen />;
    case 'recurring':
      return <RecurringScreen />;
    case 'developer':
      return <DeveloperToolsScreen />;
    case 'app-lock':
      return <AppLockScreen />;
    case 'coming-soon':
      return <ComingSoonScreen feature={route.feature} phase={route.phase} />;
  }
}

function BootSplash() {
  return (
    <div className="full bootsplash">
      <img src={logoUrl} alt="Flow" className="bootsplash-logo" />
    </div>
  );
}

export function AppRoot() {
  const store = useAppStore();
  const nav = useNav();
  const [unlocked, setUnlocked] = useState(false);

  const lockActive =
    store.ready && store.settings.appLockEnabled && !!store.settings.pinHash && !unlocked;

  // Re-lock when the app returns from the background (native only).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let handle: { remove(): void } | undefined;
    let wasActive = true;
    void App.addListener('appStateChange', (state) => {
      if (state.isActive && !wasActive) setUnlocked(false);
      wasActive = state.isActive;
    }).then((h) => {
      if (disposed) h.remove();
      else handle = h;
    });
    return () => {
      disposed = true;
      handle?.remove();
    };
  }, []);

  // Single Android back handler with correct priority.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    let handle: { remove(): void } | undefined;
    void App.addListener('backButton', () => {
      if (lockActive) return; // swallow while locked
      if (nav.route) nav.pop();
      else if (nav.tab !== 'home') nav.setTab('home');
      else void App.exitApp();
    }).then((h) => {
      if (disposed) h.remove();
      else handle = h;
    });
    return () => {
      disposed = true;
      handle?.remove();
    };
  }, [nav, lockActive]);

  // Status bar follows the system theme.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      void StatusBar.setStyle({ style: dark.matches ? Style.Dark : Style.Light });
      void StatusBar.setBackgroundColor({ color: dark.matches ? DARK_BG : LIGHT_BG });
    };
    apply();
    dark.addEventListener('change', apply);
    return () => dark.removeEventListener('change', apply);
  }, []);

  if (!store.ready) return <BootSplash />;
  if (lockActive) {
    return <LockGate pinHash={store.settings.pinHash!} onSuccess={() => setUnlocked(true)} />;
  }
  if (!store.settings.onboarded) return <OnboardingFlow />;

  const tabs: Record<TabName, ReactNode> = {
    home: <HomeScreen />,
    transactions: <TransactionsScreen />,
    insights: <InsightsScreen />,
    settings: <SettingsScreen />,
  };
  const screenKey = nav.route
    ? `route-${nav.route.name}${'id' in nav.route ? `-${nav.route.id}` : ''}`
    : `tab-${nav.tab}`;

  const showFab =
    !nav.route && (nav.tab === 'home' || nav.tab === 'transactions');

  return (
    <div className="app-frame">
      <main className="screen" key={screenKey}>
        {nav.route ? renderRoute(nav.route) : tabs[nav.tab]}
      </main>
      {showFab && (
        <button
          type="button"
          className="fab"
          onClick={() => nav.push({ name: 'add-transaction' })}
          aria-label="Add transaction"
        >
          <Plus size={26} strokeWidth={2} />
        </button>
      )}
      {!nav.route && <BottomNavigation tab={nav.tab} onSelect={nav.setTab} />}
    </div>
  );
}
