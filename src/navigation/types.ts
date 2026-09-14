export type TabName = 'home' | 'transactions' | 'insights' | 'settings';

export type Route =
  | { name: 'transaction'; id: string }
  | { name: 'categories' }
  | { name: 'merchant-rules' }
  | { name: 'recurring' }
  | { name: 'developer' }
  | { name: 'app-lock' }
  | { name: 'coming-soon'; feature: string; phase: string };
