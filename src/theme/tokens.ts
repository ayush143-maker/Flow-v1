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

/** Default category palette (matches the default category set). */
export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#FF7A59',
  Groceries: '#4ADE80',
  Shopping: '#7C6CF0',
  Travel: '#38BDF8',
  Bills: '#F5A524',
  Entertainment: '#F472B6',
  Health: '#2FD6B3',
  Education: '#60A5FA',
  Subscriptions: '#A78BFA',
  Cash: '#94A3B8',
  Transfers: '#CBD5E1',
  Others: '#8B97AC',
};

export const FALLBACK_CATEGORY_COLOR = '#8B97AC';

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? FALLBACK_CATEGORY_COLOR;
}
