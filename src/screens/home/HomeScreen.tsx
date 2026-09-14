import { useMemo } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { BarChart, DonutChart, type DonutSlice } from '@/components/charts';
import { TransactionRow } from '@/components/TransactionRow';
import { Button, EmptyState } from '@/components/ui';
import {
  categoryBreakdown,
  debits,
  dailyTotals,
  inRange,
  monthToDate,
  periodStats,
} from '@/services/analytics/derive';
import { categoryColor } from '@/theme/tokens';
import { formatMoney, formatMoneyCompact, greeting, monthLabel, percentChange } from '@/utils/format';

export function HomeScreen() {
  const { profile, transactions, categories } = useAppStore();
  const nav = useNav();
  const now = useMemo(() => new Date(), []);
  const { from, prevFrom, prevTo } = monthToDate(now);

  const monthDebits = useMemo(
    () => debits(inRange(transactions, from, now)),
    [transactions, from, now],
  );
  const cur = useMemo(() => periodStats(transactions, from, now), [transactions, from, now]);
  const prev = useMemo(
    () => periodStats(transactions, prevFrom, prevTo),
    [transactions, prevFrom, prevTo],
  );
  const breakdown = useMemo(() => categoryBreakdown(monthDebits), [monthDebits]);
  const daily = useMemo(() => dailyTotals(transactions, 30, now), [transactions, now]);
  const recent = useMemo(() => transactions.slice(0, 5), [transactions]);

  const pct = percentChange(cur.totalMinor, prev.totalMinor);
  const spendDown = pct !== null && pct < 0;

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
        <p className="hero-label">This month&apos;s spending</p>
        <strong className="hero-amount">
          {monthDebits.length > 0 ? formatMoney(cur.totalMinor) : '—'}
        </strong>
        <span className={`hero-delta ${pct === null ? '' : spendDown ? 'is-good' : 'is-bad'}`}>
          {pct === null
            ? 'No comparison yet'
            : `${spendDown ? '↓' : '↑'} ${Math.abs(pct)}% vs last month`}
        </span>
        <div className="hero-bars">
          <BarChart bars={daily.map((v) => ({ value: v }))} height={52} />
        </div>
      </section>

      <section className="card section rise rise-2">
        <div className="section-head">
          <h3>Spending breakdown</h3>
          <span className="section-month">{monthLabel(now)}</span>
        </div>
        {breakdown.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={24} />}
            title="No spending yet this month"
            body="Detected transactions will appear here automatically."
          />
        ) : (
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
        )}
      </section>

      <section className="card section rise rise-3">
        <div className="section-head">
          <h3>Recent transactions</h3>
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
            body="Grant SMS access or generate test data from Developer Tools."
          />
        ) : (
          <ul className="txn-list">
            {recent.map((t) => (
              <li key={t.id}>
                <TransactionRow txn={t} onClick={() => nav.push({ name: 'transaction', id: t.id })} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length === 0 && (
        <Button
          variant="secondary"
          block
          onClick={() => nav.push({ name: 'developer' })}
        >
          Open Developer Tools
        </Button>
      )}
    </div>
  );
}
