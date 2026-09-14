import { useMemo } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { BarChart, DonutChart, type DonutSlice } from '@/components/charts';
import { TransactionRow } from '@/components/TransactionRow';
import { MerchantAvatar } from '@/components/icons';
import { Button, EmptyState } from '@/components/ui';
import {
  categoryBreakdown,
  dailyTotals,
  inRange,
  monthToDate,
  periodStats,
} from '@/services/analytics/derive';
import { detectRecurring, monthlyEquivalentMinor } from '@/services/analytics/recurring';
import { categoryColor } from '@/theme/tokens';
import {
  dayMonth,
  formatMoney,
  formatMoneyCompact,
  greeting,
  monthLabel,
  percentChange,
  startOfDay,
} from '@/utils/format';

const FREQ_LABEL: Record<string, string> = {
  weekly: 'week',
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
};

export function HomeScreen() {
  const { profile, transactions, categories } = useAppStore();
  const nav = useNav();
  const now = useMemo(() => new Date(), []);
  const { from, prevFrom, prevTo } = monthToDate(now);

  const monthTxns = useMemo(() => inRange(transactions, from, now), [transactions, from, now]);
  const cur = useMemo(() => periodStats(transactions, from, now), [transactions, from, now]);
  const prev = useMemo(
    () => periodStats(transactions, prevFrom, prevTo),
    [transactions, prevFrom, prevTo],
  );
  const breakdown = useMemo(() => categoryBreakdown(monthTxns), [monthTxns]);
  const daily = useMemo(() => dailyTotals(transactions, 30, now), [transactions, now]);

  const todayStart = useMemo(() => startOfDay(now), [now]);
  const todayTxns = useMemo(
    () => inRange(transactions, todayStart, now).filter((t) => t.type === 'debit'),
    [transactions, todayStart, now],
  );
  const todayTotal = useMemo(
    () => todayTxns.reduce((s, t) => s + t.amountMinor, 0),
    [todayTxns],
  );

  const recent = todayTxns.length > 0 ? todayTxns.slice(0, 3) : transactions.slice(0, 3);
  const recentLabel =
    todayTxns.length > 0 ? `Today · ${formatMoney(todayTotal)}` : 'Recent activity';

  const recurring = useMemo(() => detectRecurring(transactions), [transactions]);
  const bills = useMemo(
    () =>
      recurring
        .filter((r) => transactions.some((t) => t.merchantNormalized === r.merchantNormalized))
        .slice(0, 3),
    [recurring, transactions],
  );
  const billsMonthly = useMemo(
    () => bills.reduce((s, r) => s + monthlyEquivalentMinor(r), 0),
    [bills],
  );

  const pct = percentChange(cur.totalMinor, prev.totalMinor);
  const spendDown = pct !== null && pct < 0;
  const firstName = (profile?.name ?? 'there').split(' ')[0];

  const slices = useMemo<DonutSlice[]>(() => {
    const colorOf = (name: string) =>
      categories.find((c) => c.name === name)?.color ?? categoryColor(name);
    const top = breakdown.slice(0, 5).map((x) => ({
      label: x.category,
      value: x.amountMinor,
      color: colorOf(x.category),
    }));
    const rest = breakdown.slice(5).reduce((s, x) => s + x.amountMinor, 0);
    if (rest > 0) top.push({ label: 'Others', value: rest, color: colorOf('Others') });
    return top;
  }, [breakdown, categories]);

  const initials = (profile?.name ?? 'F')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="pad home">
      <header className="home-head">
        <div>
          <p className="home-greet">{greeting(now)},</p>
          <h1 className="home-name">{profile?.name ?? 'there'}</h1>
        </div>
        <button
          type="button"
          className="home-avatar"
          onClick={() => nav.setTab('settings')}
          aria-label="Open settings"
        >
          {initials}
        </button>
      </header>

      <section className="hero-card rise rise-1" aria-label="This month's spending">
        <p className="hero-kicker">Okay {firstName}, you spent</p>
        <strong className="hero-amount">
          {cur.count > 0 ? formatMoney(cur.totalMinor) : '₹0'}
        </strong>
        <div className="hero-meta">
          <span>in {monthLabel(now)}</span>
          <span className={`hero-delta ${pct === null ? '' : spendDown ? 'is-good' : 'is-bad'}`}>
            {pct === null
              ? 'No comparison yet'
              : `${spendDown ? '↓' : '↑'} ${Math.abs(pct)}% vs last month`}
          </span>
        </div>
        <div className="hero-bars">
          <BarChart bars={daily.map((v) => ({ value: v }))} height={48} />
        </div>
      </section>

      <section className="card section rise rise-2">
        <div className="section-head">
          <h3>{recentLabel}</h3>
          <button
            type="button"
            className="section-link"
            onClick={() => nav.setTab('transactions')}
          >
            See all <ChevronRight size={14} />
          </button>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={24} />}
            title="No transactions yet"
            body="Sync SMS or generate test data from Developer Tools."
          />
        ) : (
          <ul className="txn-list">
            {recent.map((t) => (
              <li key={t.id}>
                <TransactionRow
                  txn={t}
                  showDate={todayTxns.length === 0}
                  onClick={() => nav.push({ name: 'transaction', id: t.id })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {breakdown.length > 0 && (
        <section className="card section rise rise-2">
          <div className="section-head">
            <h3>Spending breakdown</h3>
            <span className="section-month">{monthLabel(now)}</span>
          </div>
          <div className="bd-grid">
            <DonutChart
              slices={slices}
              centerValue={formatMoneyCompact(cur.totalMinor)}
              centerLabel="total"
            />
            <ul className="legend">
              {breakdown.slice(0, 4).map((c) => (
                <li key={c.category} className="legend-row">
                  <span
                    className="legend-dot"
                    style={{
                      background:
                        categories.find((x) => x.name === c.category)?.color ??
                        categoryColor(c.category),
                    }}
                  />
                  <span className="legend-name">{c.category}</span>
                  <span className="legend-share">{Math.round(c.share * 100)}%</span>
                  <span className="legend-val">{formatMoneyCompact(c.amountMinor)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {bills.length > 0 && (
        <section className="card section rise rise-3">
          <div className="section-head">
            <h3>Upcoming bills</h3>
            <span className="section-month">{formatMoneyCompact(billsMonthly)}/mo total</span>
          </div>
          {bills.map((r) => {
            const sample = transactions.find(
              (t) => t.merchantNormalized === r.merchantNormalized,
            );
            if (!sample) return null;
            return (
              <div key={r.id} className="bill-row">
                <MerchantAvatar txn={sample} size={40} />
                <div className="bill-main">
                  <strong>{r.merchant}</strong>
                  <span>
                    {formatMoney(r.amountMinor)} / {FREQ_LABEL[r.frequency]}
                  </span>
                </div>
                <div className="bill-next">
                  <strong>{dayMonth(r.nextExpected ?? r.lastSeen)}</strong>
                  <span>next expected{r.isEstimate ? ' · est.' : ''}</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {transactions.length === 0 && (
        <Button variant="secondary" block onClick={() => nav.push({ name: 'developer' })}>
          Open Developer Tools
        </Button>
      )}
    </div>
  );
}
