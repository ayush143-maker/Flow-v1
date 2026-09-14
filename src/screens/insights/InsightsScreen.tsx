import { useMemo, useState } from 'react';
import {
  Banknote, ChevronRight, Repeat, Sparkles, TrendingDown, TrendingUp, UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { BarChart } from '@/components/charts';
import { MerchantAvatar } from '@/components/icons';
import { TransactionRow } from '@/components/TransactionRow';
import { Button, EmptyState, SegmentedControl } from '@/components/ui';
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
          icon={<Sparkles size={24} />}
          title="No data to analyze yet"
          body="Once transactions are detected, insights appear here — computed on-device."
          action={
            <Button size="sm" variant="secondary" onClick={() => nav.push({ name: 'developer' })}>
              Developer Tools
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

      <section className="hero-card">
        <p className="hero-label">{PERIOD_TITLE[mode]}</p>
        <strong className="hero-amount">{formatMoney(cur.totalMinor)}</strong>
        <div className="hero-meta">
          <span>~{formatMoney(cur.avgDailyMinor)}/day</span>
          <span className={`hero-delta ${pct === null ? '' : pct < 0 ? 'is-good' : 'is-bad'}`}>
            {pct === null ? 'No comparison' : `${pct < 0 ? '↓' : '↑'} ${Math.abs(pct)}% vs prev`}
          </span>
        </div>
      </section>

      <section className="card section">
        <div className="section-head">
          <h3>Spending trend</h3>
        </div>
        <BarChart bars={bars} height={110} showLabels />
      </section>

      <section className="card section">
        <div className="section-head">
          <h3>Category trends</h3>
        </div>
        <ul className="cat-trend-list">
          {curBd.slice(0, 6).map((c) => {
            const prevAmt = prevBd.find((p) => p.category === c.category)?.amountMinor ?? 0;
            const delta = percentChange(c.amountMinor, prevAmt);
            return (
              <li key={c.category} className="cat-trend-row">
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

      <section className="card section">
        <div className="section-head">
          <h3>Top merchants</h3>
        </div>
        <ul className="txn-list">
          {topM.map((m) => {
            const sample = curTxns.find((t) => t.merchantNormalized === m.merchantNormalized);
            return sample ? (
              <li key={m.merchantNormalized} className="topm-row">
                <MerchantAvatar txn={sample} size={38} />
                <span className="txn-info">
                  <span className="txn-merchant">{m.merchant}</span>
                  <span className="txn-sub">{m.count} {m.count === 1 ? 'txn' : 'txns'}</span>
                </span>
                <span className="txn-amount">{formatMoney(m.amountMinor)}</span>
              </li>
            ) : null;
          })}
        </ul>
      </section>

      <section className="card section">
        <div className="section-head">
          <h3>Largest transactions</h3>
        </div>
        <ul className="txn-list">
          {largest.map((t) => (
            <li key={t.id}>
              <TransactionRow txn={t} onClick={() => nav.push({ name: 'transaction', id: t.id })} />
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="card section rec-link" onClick={() => nav.push({ name: 'recurring' })}>
        <div className="section-head">
          <h3>Recurring payments</h3>
          <span className="section-link">
            View all <ChevronRight size={14} />
          </span>
        </div>
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

      <section className="card section">
        <div className="section-head">
          <h3>Signals</h3>
          <span className="section-month">computed on-device</span>
        </div>
        <ul className="signal-list">
          {insights.map((ins) => {
            const Icon = INSIGHT_ICONS[ins.icon] ?? Sparkles;
            return <SignalRow key={ins.id} insight={ins} Icon={Icon} />;
          })}
        </ul>
      </section>
    </div>
  );
}

function SignalRow({ insight, Icon }: { insight: Insight; Icon: LucideIcon }) {
  return (
    <li className={`signal signal--${insight.tone}`}>
      <span className="signal-icon">
        <Icon size={18} />
      </span>
      <div className="signal-body">
        <p className="signal-title">{insight.title}</p>
        <p className="signal-detail">{insight.detail}</p>
      </div>
    </li>
  );
}
