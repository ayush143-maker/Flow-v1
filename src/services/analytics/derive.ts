import type { Transaction } from '@/types';
import { addDays, daysInMonth, startOfDay, startOfMonth } from '@/utils/format';

export type PeriodMode = 'weekly' | 'monthly' | 'yearly';

export interface CategorySlice {
  category: string;
  amountMinor: number;
  count: number;
  share: number;
}

export interface MerchantTotal {
  merchant: string;
  merchantNormalized: string;
  amountMinor: number;
  count: number;
}

export interface PeriodStats {
  totalMinor: number;
  count: number;
  avgDailyMinor: number;
  days: number;
}

export function debits(txns: Transaction[]): Transaction[] {
  return txns.filter((t) => t.type === 'debit');
}

export function credits(txns: Transaction[]): Transaction[] {
  return txns.filter((t) => t.type === 'credit');
}

/** Inclusive start, exclusive end. */
export function inRange(txns: Transaction[], from: Date, to: Date): Transaction[] {
  return txns.filter((t) => {
    const ts = new Date(t.transactionDate).getTime();
    return ts >= from.getTime() && ts < to.getTime();
  });
}

export function periodStats(txns: Transaction[], from: Date, to: Date): PeriodStats {
  const list = debits(inRange(txns, from, to));
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
  const totalMinor = list.reduce((s, t) => s + t.amountMinor, 0);
  return { totalMinor, count: list.length, avgDailyMinor: Math.round(totalMinor / days), days };
}

export function categoryBreakdown(txns: Transaction[]): CategorySlice[] {
  const list = debits(txns);
  const total = list.reduce((s, t) => s + t.amountMinor, 0);
  const map = new Map<string, { amountMinor: number; count: number }>();
  for (const t of list) {
    const cur = map.get(t.category) ?? { amountMinor: 0, count: 0 };
    cur.amountMinor += t.amountMinor;
    cur.count += 1;
    map.set(t.category, cur);
  }
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      amountMinor: v.amountMinor,
      count: v.count,
      share: total > 0 ? v.amountMinor / total : 0,
    }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
}

export function topMerchants(txns: Transaction[], n = 5): MerchantTotal[] {
  const map = new Map<string, MerchantTotal>();
  for (const t of debits(txns)) {
    const cur = map.get(t.merchantNormalized);
    if (cur) {
      cur.amountMinor += t.amountMinor;
      cur.count += 1;
    } else {
      map.set(t.merchantNormalized, {
        merchant: t.merchant,
        merchantNormalized: t.merchantNormalized,
        amountMinor: t.amountMinor,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.amountMinor - a.amountMinor).slice(0, n);
}

/** Daily debit totals for the last N days, oldest → newest. */
export function dailyTotals(txns: Transaction[], days: number, end: Date): number[] {
  const sums = new Array<number>(days).fill(0);
  const endDay = startOfDay(end).getTime();
  for (const t of debits(txns)) {
    const diff = Math.floor((endDay - startOfDay(new Date(t.transactionDate)).getTime()) / 86400000);
    if (diff >= 0 && diff < days) sums[days - 1 - diff] += t.amountMinor;
  }
  return sums;
}

/** Current month-to-date vs the same day range of the previous month. */
export function monthToDate(now: Date): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const from = startOfMonth(now);
  const to = startOfDay(addDays(now, 1));
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevFrom = startOfMonth(prevMonth);
  const prevDays = Math.min(now.getDate(), daysInMonth(prevMonth));
  const prevTo = startOfDay(addDays(prevFrom, prevDays));
  return { from, to, prevFrom, prevTo };
}

export function periodFor(
  mode: PeriodMode,
  now: Date,
): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const days = mode === 'weekly' ? 7 : mode === 'monthly' ? 30 : 365;
  const to = startOfDay(addDays(now, 1));
  const from = addDays(to, -days);
  const prevTo = from;
  const prevFrom = addDays(from, -days);
  return { from, to, prevFrom, prevTo };
}

/** Labelled bars for the Insights trend chart. */
export function buckets(
  txns: Transaction[],
  mode: PeriodMode,
  now: Date,
): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  if (mode === 'weekly') {
    for (let i = 6; i >= 0; i--) {
      const day = addDays(now, -i);
      const next = addDays(day, 1);
      const value = debits(inRange(txns, startOfDay(day), startOfDay(next))).reduce(
        (s, t) => s + t.amountMinor,
        0,
      );
      out.push({ label: day.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2), value });
    }
  } else if (mode === 'monthly') {
    for (let i = 5; i >= 0; i--) {
      const start = startOfDay(addDays(now, -(i * 7 + 6)));
      const end = addDays(start, 7);
      const value = debits(inRange(txns, start, end)).reduce((s, t) => s + t.amountMinor, 0);
      out.push({
        label: `${start.getDate()} ${start.toLocaleDateString('en-IN', { month: 'short' })}`,
        value,
      });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const value = debits(inRange(txns, start, end)).reduce((s, t) => s + t.amountMinor, 0);
      out.push({ label: start.toLocaleDateString('en-IN', { month: 'short' }), value });
    }
  }
  return out;
}
