/**
 * Flow — design tokens visible to TypeScript.
 * CSS-side tokens live in src/theme/global.css — keep both in sync.
 *
 * Direction: warm neutral base, pastel accents, one teal accent for state.
 * 80% of the interface stays neutral; accents only where they mean something.
 */

export const BRAND = {
  teal: '#69B9AD',
  lavender: '#DDD7F2',
  mint: '#C8E5DE',
  softBlue: '#D8E6F2',
} as const;

export const SEMANTIC = {
  positive: '#5FAF86',
  negative: '#D66F72',
  warning: '#C9A961',
  credit: '#5FAF86',
  danger: '#D66F72',
} as const;

export interface CategoryDef {
  name: string;
  icon: string;
  color: string;
}

/**
 * Default categories — muted accent colors (readable on cream/white).
 * NOTE: installed databases still carry the old vibrant seed colors; the UI
 * resolves DEFAULT categories through this palette and only custom
 * categories use their stored color — no migration needed.
 */
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { name: 'Food', icon: 'food', color: '#DE9678' },
  { name: 'Shopping', icon: 'shopping', color: '#9B8FDC' },
  { name: 'Travel', icon: 'travel', color: '#7FB3E0' },
  { name: 'Bills', icon: 'bills', color: '#D3A45E' },
  { name: 'Entertainment', icon: 'entertainment', color: '#DE93B6' },
  { name: 'Health', icon: 'health', color: '#69B9AD' },
  { name: 'Education', icon: 'education', color: '#7FA6E8' },
  { name: 'Groceries', icon: 'groceries', color: '#8FC98A' },
  { name: 'Subscriptions', icon: 'subscriptions', color: '#B5A7E8' },
  { name: 'Cash', icon: 'cash', color: '#A6ACB8' },
  { name: 'Transfers', icon: 'transfers', color: '#B9C0CC' },
  { name: 'Others', icon: 'others', color: '#A8ADA8' },
];

const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => [c.name, c.color]),
);

export const FALLBACK_CATEGORY_COLOR = '#A8ADA8';

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? FALLBACK_CATEGORY_COLOR;
}
