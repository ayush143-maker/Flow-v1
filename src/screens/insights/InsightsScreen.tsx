import { useMemo, useState } from 'react';
import {
  Banknote, ChevronRight, Repeat, Sparkles, TrendingDown, TrendingUp,
  UtensilsCrossed, type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { BarChart } from '@/components/charts';
import { TransactionRow } from '@/components/TransactionRow';
import { Button, EmptyState, SegmentedControl } from '@/components/ui';
import { SectionHeader } from '@/components/SectionHeader';
import { InsightCard, type InsightTone } from '@/components/InsightCard';
import {
  buckets,
  categoryBreakdown,
  inRange,
  periodFor,
  periodStats,
  topMerchants,
  type PeriodMode,
} from '@/services/analytics/derive';
import { detectRecurring, monthlyEquivalentMinor } from '@/services/analytics/recurring';
import { generateInsights, type Insight } from '@/services/analytics/insights';
import { categoryColor } from '@/theme/tokens';
import { formatMoney, formatMoneyCompact, percentChange } from '@/utils/format';

const MODES: { value: PeriodMode; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const PERIOD_TITLE: Record<PeriodMode, string> = {
  weekly: 'This week',
  monthly: 'Last 30 days',
  yearly: 'Last 12 months',
};

const INSIGHT_ICONS: Record<string, LucideIcon> = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  repeat: Repeat,
  food: UtensilsCrossed,
  cash: Banknote,
  sparkles: Sparkles,
};

const TONE_MAP: Record<Insight['tone'], InsightTone> = {
  up: 'negative',
  down: 'positive',
  info: 'neutral',
  warn: 'negative',
};

export function InsightsScreen() {
  const { transactions } = useAppStore();
  const nav = useNav();
  const [mode, setMode] = useState<PeriodMode>('monthly');
  const now = useMemo(() => new Date(), []);

  const period = useMemo(() => periodFor(mode, now), [mode, now]);
  const cur = useMemo(
    () => periodStats(transactions, period.from, period.to),
    [transactions, period],
  );
  const prev = useMemo(
    () => periodStats(transactions, period.prevFrom, period.prevTo),
    [transactions, period],
  );
  const curTxns = useMemo(
    () => inRange(transactions, period.from, period.to),
    [transactions, period],
  );
  const prevTxns = useMemo(
    () => inRange(transactions, period.prevFrom, period.prevTo),
    [transactions, period],
  );
  const bars = useMemo(() => buckets(transactions, mode, now), [transactions, mode, now]);
  const curBd = useMemo(() => categoryBreakdown(curTxns), [curTxns]);
  const prevBd = useMemo(() => categoryBreakdown(prevTxns), [prevTxns]);
  const topM = useMemo(() => topMerchants(curTxns, 5), [curTxns]);
  const largest = useMemo(
    () =>
      [...curTxns]
        .filter((t) => t.type === 'debit')
        .sort((a, b) => b.amountMinor - a.amountMinor)
        .slice(0, 3),
    [curTxns],
  );
  const recurring = useMemo(() => detectRecurring(transactions), [transactions]);
  const insights = useMemo(() => generateInsights(transactions, now), [transactions, now]);

  const pct = percentChange(cur.totalMinor, prev.totalMinor);
  const recurringMonthly = recurring.reduce((s, r) => s + monthlyEquivalentMinor(r), 0);

  if (transactions.length === 0) {
    return (
      <div className="pad">
        <h1 className="screen-title">Insights</h1>
        <EmptyState
          title="Nothing to analyze yet."
          body="Once Flow detects your first transaction, insights will appear here — computed on your device."
          action={
            <Button size="sm" variant="secondary" onClick={() => nav.push({ name: 'developer' })}>
              Developer tools
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="pad ins">
      <h1 className="screen-title">Insights</h1>
      <SegmentedControl options={MODES} value={mode} onChange={setMode} />

      <section className="hero rise rise-1">
        <strong className="hero-amount">{formatMoney(cur.totalMinor)}</strong>
        <p className="hero-caption">
          spent · {PERIOD_TITLE[mode].toLowerCase()}
          <span className={`hero-delta ${pct === null ? '' : pct < 0 ? 'is-good' : 'is-bad'}`}>
            {pct === null ? 'No comparison' : `${pct < 0 ? '↓' : '↑'} ${Math.abs(pct)}%`}
          </span>
        </p>
        <p className="page-sub" style={{ margin: '10px 0 0' }}>
          ~{formatMoney(cur.avgDailyMinor)} a day, on average
        </p>
      </section>

      {insights.length > 0 && (
        <section className="rise rise-2" style={{ marginBottom: 24 }}>
          <SectionHeader title="This month, in words" />
          <div className="ins-list">
            {insights.map((ins) => {
              const Icon = INSIGHT_ICONS[ins.icon] ?? Sparkles;
              return (
                <InsightCard
                  key={ins.id}
                  tone={TONE_MAP[ins.tone]}
                  title={ins.title}
                  detail={ins.detail}
                  icon={<Icon size={16} />}
                />
              );
            })}
          </div>
        </section>
      )}

      <section className="card section rise rise-2">
        <SectionHeader title="Spending trend" />
        <BarChart bars={bars} height={110} showLabels />
      </section>

      <section className="card section rise rise-2">
        <SectionHeader title="Category trends" />
        <ul className="cat-trend-list">
          {curBd.slice(0, 6).map((c) => {
            const prevAmt = prevBd.find((p) => p.category === c.category)?.amountMinor ?? 0;
            const delta = percentChange(c.amountMinor, prevAmt);
            return (
              <li key={c.category} className="cat-trend-row">
                <span className="txn-dot" style={{ background: categoryColor(c.category) }} />
                <span className="legend-name">{c.category}</span>
                <span className="legend-val">{formatMoneyCompact(c.amountMinor)}</span>
                <span className={`delta-chip ${delta === null ? '' : delta < 0 ? 'is-good' : 'is-bad'}`}>
                  {delta === null ? (c.amountMinor > 0 ? 'New' : '—') : `${delta < 0 ? '−' : '+'}${Math.abs(delta)}%`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card section rise rise-3">
        <SectionHeader title="Top merchants" />
        <ul className="txn-list">
          {topM.map((m) => (
            <li key={m.merchantNormalized} className="topm-row">
              <span className="txn-dot" style={{ background: categoryColor('Transfers') }} />
              <span className="txn-info">
                <span className="txn-merchant">{m.merchant}</span>
                <span className="txn-sub">
                  {m.count} {m.count === 1 ? 'transaction' : 'transactions'}
                </span>
              </span>
              <span className="txn-amount">{formatMoney(m.amountMinor)}</span>
            </li>
          ))}
        </ul>
      </section>

      {largest.length > 0 && (
        <section className="card section rise rise-3">
          <SectionHeader title="Largest transactions" />
          <ul className="txn-list">
            {largest.map((t) => (
              <li key={t.id}>
                <TransactionRow txn={t} onClick={() => nav.push({ name: 'transaction', id: t.id })} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        className="card section rec-link rise rise-3"
        onClick={() => nav.push({ name: 'recurring' })}
      >
        <SectionHeader
          title="Recurring payments"
          action={
            <span className="section-link">
              View all <ChevronRight size={14} />
            </span>
          }
        />
        <p className="rec-summary">
          {recurring.length > 0 ? (
            <>
              <strong>{formatMoneyCompact(recurringMonthly)}/month</strong> across{' '}
              {recurring.length} detected {recurring.length === 1 ? 'payment' : 'payments'}
            </>
          ) : (
            'No recurring payments detected yet.'
          )}
        </p>
      </button>
    </div>
  );
}
