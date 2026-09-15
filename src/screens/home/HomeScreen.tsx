import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { FlowHeader } from '@/components/FlowHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { SpendingHero } from '@/components/SpendingHero';
import { SpendingChart, type SpendSlice } from '@/components/SpendingChart';
import { TransactionRow } from '@/components/TransactionRow';
import { Button, EmptyState } from '@/components/ui';
import { categoryBreakdown, inRange, periodStats } from '@/services/analytics/derive';
import { categoryColor } from '@/theme/tokens';
import {
  addMonths,
  greeting,
  monthLabel,
  percentChange,
  startOfDay,
  startOfMonth,
} from '@/utils/format';

export function HomeScreen() {
  const { profile, transactions, categories } = useAppStore();
  const nav = useNav();
  const now = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = useState(0);

  const base = useMemo(
    () => startOfMonth(addMonths(now, -monthOffset)),
    [now, monthOffset],
  );
  const to = useMemo(
    () => (monthOffset === 0 ? now : addMonths(base, 1)),
    [monthOffset, now, base],
  );
  const prevFrom = useMemo(() => addMonths(base, -1), [base]);

  const monthTxns = useMemo(
    () => inRange(transactions, base, to),
    [transactions, base, to],
  );
  const cur = useMemo(
    () => periodStats(transactions, base, to),
    [transactions, base, to],
  );
  const prev = useMemo(
    () => periodStats(transactions, prevFrom, base),
    [transactions, prevFrom, base],
  );
  const breakdown = useMemo(() => categoryBreakdown(monthTxns), [monthTxns]);

  const todayStart = useMemo(() => startOfDay(now), [now]);
  const todayTxns = useMemo(
    () => inRange(transactions, todayStart, now).filter((t) => t.type === 'debit'),
    [transactions, todayStart, now],
  );
  const todayTotal = useMemo(
    () => todayTxns.reduce((s, t) => s + t.amountMinor, 0),
    [todayTxns],
  );
  const recent = todayTxns.length > 0 ? todayTxns.slice(0, 4) : transactions.slice(0, 4);

  const pct = percentChange(cur.totalMinor, prev.totalMinor);
  const firstName = (profile?.name ?? 'there').split(' ')[0];
  const initials = (profile?.name ?? 'F')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const slices = useMemo<SpendSlice[]>(() => {
    const colorFor = (name: string) => {
      const c = categories.find((x) => x.name === name);
      return c && c.isCustom ? c.color : categoryColor(name);
    };
    const top = breakdown.slice(0, 5).map((x) => ({
      category: x.category,
      amountMinor: x.amountMinor,
      share: x.share,
      color: colorFor(x.category),
    }));
    const rest = breakdown.slice(5).reduce((s, x) => s + x.amountMinor, 0);
    const restShare = breakdown.slice(5).reduce((s, x) => s + x.share, 0);
    if (rest > 0) {
      top.push({ category: 'Other', amountMinor: rest, share: restShare, color: colorFor('Others') });
    }
    return top;
  }, [breakdown, categories]);

  return (
    <div className="pad home">
      <FlowHeader
        eyebrow={`${greeting(now)}, ${firstName}`}
        right={
          <button
            type="button"
            className="home-avatar"
            onClick={() => nav.setTab('settings')}
            aria-label="Open profile"
          >
            {initials}
          </button>
        }
      />

      <SpendingHero
        amountMinor={cur.totalMinor}
        deltaPercent={pct}
        monthLabel={monthOffset === 0 ? 'This month' : monthLabel(base)}
        caption={monthOffset === 0 ? 'spent this month' : 'total spending'}
        onPrevMonth={() => setMonthOffset((o) => o + 1)}
        onNextMonth={() => setMonthOffset((o) => Math.max(0, o - 1))}
        nextDisabled={monthOffset === 0}
      />

      {breakdown.length > 0 && (
        <section className="card section rise rise-2">
          <SectionHeader
            title="Where it went"
            action={
              <button
                type="button"
                className="section-link"
                onClick={() => nav.push({ name: 'categories' })}
              >
                Categories <ChevronRight size={14} />
              </button>
            }
          />
          <SpendingChart slices={slices} />
        </section>
      )}

      <section className="card section rise rise-3">
        <SectionHeader
          title={todayTxns.length > 0 ? 'Today' : 'Recent activity'}
          action={
            <button
              type="button"
              className="section-link"
              onClick={() => nav.setTab('transactions')}
            >
              See all <ChevronRight size={14} />
            </button>
          }
        />
        {recent.length === 0 ? (
          <EmptyState
            title="Nothing here yet."
            body="Once Flow detects your first transaction, it'll appear here automatically."
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => nav.push({ name: 'add-transaction' })}
              >
                Add one manually
              </Button>
            }
          />
        ) : (
          <ul className="txn-list stagger">
            {recent.map((t, i) => (
              <li key={t.id} style={{ '--i': String(i) } as React.CSSProperties}>
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

      {todayTxns.length > 0 && (
        <p className="page-foot-hint">
          Today so far · ₹{(todayTotal / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>
      )}
    </div>
  );
}
