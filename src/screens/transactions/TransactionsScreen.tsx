import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Search, X } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { TransactionRow } from '@/components/TransactionRow';
import { Button, Chip, EmptyState } from '@/components/ui';
import { formatMoney } from '@/utils/format';

type FilterValue = 'all' | 'debit' | 'credit' | 'upi' | 'card';

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
];

function groupKey(iso: string): 'today' | 'yesterday' | 'earlier' {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return 'earlier';
}

const TITLES: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

export function TransactionsScreen() {
  const { transactions } = useAppStore();
  const nav = useNav();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [visible, setVisible] = useState(40);

  useEffect(() => {
    setVisible(40);
  }, [query, filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (q && !t.merchant.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) {
        return false;
      }
      if (filter === 'all') return true;
      if (filter === 'debit' || filter === 'credit') return t.type === filter;
      return t.paymentMethod === filter;
    });
  }, [transactions, query, filter]);

  const groups = useMemo(() => {
    const out: { key: 'today' | 'yesterday' | 'earlier'; items: typeof filtered }[] = [];
    let emitted = 0;
    for (const txn of filtered) {
      if (emitted >= visible) break;
      const key = groupKey(txn.transactionDate);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(txn);
      else out.push({ key, items: [txn] });
      emitted += 1;
    }
    return out;
  }, [filtered, visible]);

  const debitsTotal = useMemo(
    () => filtered.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amountMinor, 0),
    [filtered],
  );

  return (
    <div className="pad tx">
      <h1 className="screen-title">Transactions</h1>

      <label className="tx-search">
        <Search size={16} />
        <input
          value={query}
          placeholder="Search merchants, categories…"
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
            <X size={15} />
          </button>
        ) : null}
      </label>

      <div className="tx-chips">
        {FILTERS.map((f) => (
          <Chip key={f.value} selected={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <p className="tx-count">
        {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'} ·{' '}
        {formatMoney(debitsTotal)} spent
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? `Nothing matches “${query.trim()}”` : 'Nothing here yet.'}
          body={
            query
              ? 'Try a different merchant or category.'
              : "Once Flow detects your first transaction, it'll appear here automatically."
          }
          action={
            query ? (
              <Button size="sm" variant="secondary" onClick={() => setQuery('')}>
                Clear search
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => nav.push({ name: 'add-transaction' })}
              >
                Add one manually
              </Button>
            )
          }
        />
      ) : (
        <div className="card">
          {groups.map((g) => (
            <section key={g.key}>
              <h4 className="tx-group-label">{TITLES[g.key]}</h4>
              <ul className="txn-list stagger">
                {g.items.map((t, i) => (
                  <li key={t.id} style={{ '--i': String(i) } as CSSProperties}>
                    <TransactionRow
                      txn={t}
                      showDate={g.key === 'earlier'}
                      onClick={() => nav.push({ name: 'transaction', id: t.id })}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {filtered.length > visible && (
            <div className="tx-more">
              <Button variant="ghost" block onClick={() => setVisible((v) => v + 40)}>
                Show more ({filtered.length - visible} left)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
