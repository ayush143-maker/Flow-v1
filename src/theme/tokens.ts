/**
 * Flow — design tokens visible to TypeScript (charts, inline styling).
 * CSS-side tokens live in src/theme/global.css — keep both in sync.
 */

export const BRAND = {
  mint: '#2FD6B3',
  azure: '#4FB0EC',
  violet: '#7C6CF0',
  gradient: 'linear-gradient(135deg, #2FD6B3 0%, #4FB0EC 50%, #7C6CF0 100%)',
} as const;

export const SEMANTIC = {
  credit: '#0BA678',
  danger: '#E5484D',
  warning: '#F5A524',
} as const;

export interface CategoryDef {
  name: string;
  icon: string;
  color: string;
}

/** Default category set — names, icon keys and palette. */
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { name: 'Food', icon: 'food', color: '#FF7A59' },
  { name: 'Shopping', icon: 'shopping', color: '#7C6CF0' },
  { name: 'Travel', icon: 'travel', color: '#38BDF8' },
  { name: 'Bills', icon: 'bills', color: '#F5A524' },
  { name: 'Entertainment', icon: 'entertainment', color: '#F472B6' },
  { name: 'Health', icon: 'health', color: '#2FD6B3' },
  { name: 'Education', icon: 'education', color: '#60A5FA' },
  { name: 'Groceries', icon: 'groceries', color: '#4ADE80' },
  { name: 'Subscriptions', icon: 'subscriptions', color: '#A78BFA' },
  { name: 'Cash', icon: 'cash', color: '#94A3B8' },
  { name: 'Transfers', icon: 'transfers', color: '#CBD5E1' },
  { name: 'Others', icon: 'others', color: '#8B97AC' },
];

const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => [c.name, c.color]),
);

export const FALLBACK_CATEGORY_COLOR = '#8B97AC';

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? FALLBACK_CATEGORY_COLOR;
}
