import type { Transaction } from '@/types';
import { categoryBreakdown, inRange, monthToDate, topMerchants } from './derive';
import { dateShort, formatMoney } from '@/utils/format';

export interface Insight {
  id: string;
  tone: 'up' | 'down' | 'info' | 'warn';
  icon: string;
  title: string;
  detail: string;
}

/** Rule-based, fully local insight generation — no AI, no network. */
export function generateInsights(txns: Transaction[], now: Date = new Date()): Insight[] {
  const { from, to, prevFrom, prevTo } = monthToDate(now);
  const cur = inRange(txns, from, to);
  const prev = inRange(txns, prevFrom, prevTo);
  const out: Insight[] = [];

  const curBd = categoryBreakdown(cur);
  const prevBd = categoryBreakdown(prev);
  const prevMap = new Map(prevBd.map((c) => [c.category, c]));

  // 1. Category trend vs last month (same day range)
  const top = curBd[0];
  if (top) {
    const prevAmt = prevMap.get(top.category)?.amountMinor ?? 0;
    if (prevAmt > 0) {
      const delta = top.amountMinor - prevAmt;
      const pct = Math.round((delta / prevAmt) * 100);
      if (pct >= 20 && delta >= 20000) {
        out.push({
          id: 'cat-up',
          tone: 'warn',
          icon: 'trending-up',
          title: `${top.category} spending is ${pct}% higher than last month`,
          detail: `${formatMoney(top.amountMinor)} so far, up from ${formatMoney(prevAmt)}.`,
        });
      } else if (pct <= -20) {
        out.push({
          id: 'cat-down',
          tone: 'down',
          icon: 'trending-down',
          title: `${top.category} spending is ${Math.abs(pct)}% lower than last month`,
          detail: `${formatMoney(top.amountMinor)} so far, down from ${formatMoney(prevAmt)}.`,
        });
      }
    }
  }

  // 2. Subscriptions total
  const subs = curBd.find((c) => c.category === 'Subscriptions');
  if (subs && subs.amountMinor > 0) {
    out.push({
      id: 'subs',
      tone: 'info',
      icon: 'repeat',
      title: `You spent ${formatMoney(subs.amountMinor)} on subscriptions this month`,
      detail: `${subs.count} subscription ${subs.count === 1 ? 'charge' : 'charges'} so far.`,
    });
  }

  // 3. Average daily spending change
  const curTotal = curBd.reduce((s, c) => s + c.amountMinor, 0);
  const prevTotal = prevBd.reduce((s, c) => s + c.amountMinor, 0);
  const dom = now.getDate();
  const curAvg = Math.round(curTotal / dom);
  const prevAvg = Math.round(prevTotal / dom);
  if (prevAvg > 0) {
    const pct = (curAvg - prevAvg) / prevAvg;
    if (Math.abs(pct) >= 0.15) {
      const up = pct > 0;
      out.push({
        id: 'avg-daily',
        tone: up ? 'up' : 'down',
        icon: up ? 'trending-up' : 'trending-down',
        title: `Your average daily spending ${up ? 'increased' : 'dropped'} from ₹${prevAvg.toLocaleString('en-IN')} to ₹${curAvg.toLocaleString('en-IN')}`,
        detail: `${up ? 'A faster burn rate' : 'A slower burn rate'} than the same period last month.`,
      });
    }
  }

  // 4. Largest food merchant
  const foodTop = topMerchants(
    cur.filter((t) => t.category === 'Food'),
    1,
  )[0];
  if (foodTop && foodTop.amountMinor > 0) {
    out.push({
      id: 'food-top',
      tone: 'info',
      icon: 'food',
      title: `${foodTop.merchant} is your largest food merchant this month`,
      detail: `${formatMoney(foodTop.amountMinor)} across ${foodTop.count} ${foodTop.count === 1 ? 'order' : 'orders'}.`,
    });
  }

  // 5. Cash withdrawals
  const cash = curBd.find((c) => c.category === 'Cash');
  if (cash && cash.amountMinor > 0) {
    out.push({
      id: 'cash',
      tone: 'info',
      icon: 'cash',
      title: `You withdrew ${formatMoney(cash.amountMinor)} in cash this month`,
      detail: `${cash.count} ATM ${cash.count === 1 ? 'withdrawal' : 'withdrawals'}.`,
    });
  }

  // 6. Biggest single spend
  const largest = [...cur]
    .filter((t) => t.type === 'debit')
    .sort((a, b) => b.amountMinor - a.amountMinor)[0];
  if (largest) {
    out.push({
      id: 'largest',
      tone: 'info',
      icon: 'sparkles',
      title: `Biggest spend: ${formatMoney(largest.amountMinor)} at ${largest.merchant}`,
      detail: dateShort(new Date(largest.transactionDate), now),
    });
  }

  return out.slice(0, 5);
}
