import type { RecurringPayment, RecurrenceFrequency, Transaction } from '@/types';
import { addDays } from '@/utils/format';

function frequencyFor(avgDays: number): RecurrenceFrequency | null {
  if (avgDays >= 5 && avgDays <= 9) return 'weekly';
  if (avgDays >= 26 && avgDays <= 34) return 'monthly';
  if (avgDays >= 80 && avgDays <= 100) return 'quarterly';
  if (avgDays >= 350 && avgDays <= 380) return 'yearly';
  return null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Rule-based recurring payment detection from transaction history. */
export function detectRecurring(txns: Transaction[]): RecurringPayment[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of txns) {
    if (t.type !== 'debit') continue;
    const list = groups.get(t.merchantNormalized) ?? [];
    list.push(t);
    groups.set(t.merchantNormalized, list);
  }

  const out: RecurringPayment[] = [];
  for (const [normalized, list] of groups) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
    const times = sorted.map((t) => new Date(t.transactionDate).getTime());
    const diffs: number[] = [];
    for (let i = 1; i < times.length; i++) {
      diffs.push(Math.round((times[i] - times[i - 1]) / 86400000));
    }
    const avg = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    const freq = frequencyFor(avg);
    if (!freq) continue;
    const spread = Math.max(...diffs) - Math.min(...diffs);
    if (spread > 10) continue;
    const amounts = sorted.map((t) => t.amountMinor);
    if (Math.max(...amounts) / Math.min(...amounts) > 1.3) continue;

    const last = sorted[sorted.length - 1];
    const next = addDays(new Date(last.transactionDate), Math.round(avg));
    out.push({
      id: `rp_${normalized}`,
      merchant: last.merchant,
      merchantNormalized: normalized,
      amountMinor: median(amounts),
      frequency: freq,
      lastSeen: last.transactionDate,
      nextExpected: next.toISOString(),
      isEstimate: diffs.length < 2 || spread > 3,
    });
  }
  return out.sort((a, b) => monthlyEquivalentMinor(b) - monthlyEquivalentMinor(a));
}

export function monthlyEquivalentMinor(rp: RecurringPayment): number {
  switch (rp.frequency) {
    case 'weekly':
      return Math.round(rp.amountMinor / 4.33);
    case 'quarterly':
      return Math.round(rp.amountMinor / 3);
    case 'yearly':
      return Math.round(rp.amountMinor / 12);
    default:
      return rp.amountMinor;
  }
}
