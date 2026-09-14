import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Route, TabName } from './types';

interface Nav {
  tab: TabName;
  setTab: (t: TabName) => void;
  route: Route | null;
  push: (r: Route) => void;
  pop: () => void;
}

const NavContext = createContext<Nav | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<TabName>('home');
  const [route, setRoute] = useState<Route | null>(null);

  const push = useCallback((r: Route) => setRoute(r), []);
  const pop = useCallback(() => setRoute(null), []);

  const value = useMemo(
    () => ({ tab, setTab, route, push, pop }),
    [tab, route, push, pop],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used inside NavigationProvider');
  return ctx;
}
