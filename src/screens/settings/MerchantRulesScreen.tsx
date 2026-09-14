import { useMemo } from 'react';
import { ListChecks, Sparkles, Trash2 } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { getIcon } from '@/components/icons';
import { Button, EmptyState, ScreenHeader } from '@/components/ui';
import { dayMonth } from '@/utils/format';
import { categoryColor } from '@/theme/tokens';

export function MerchantRulesScreen() {
  const { rules, transactions, deleteRule } = useAppStore();
  const nav = useNav();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      map.set(t.merchantNormalized, (map.get(t.merchantNormalized) ?? 0) + 1);
    }
    return map;
  }, [transactions]);

  return (
    <div className="pad">
      <ScreenHeader title="Merchant rules" onBack={nav.pop} />

      <p className="page-sub">
        When you correct a transaction&apos;s category, Flow remembers the merchant →
        category mapping and applies it automatically from then on.
      </p>

      {rules.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={24} />}
          title="No rules yet"
          body="Open any transaction, change its category, and a rule is created here."
        />
      ) : (
        <div className="card">
          {rules.map((r) => {
            const Icon = getIcon('others');
            const color = categoryColor(r.category);
            return (
              <div key={r.id} className="rule-row">
                <span className="rule-icon" style={{ background: `${color}22`, color }}>
                  <Icon size={18} />
                </span>
                <div className="rule-body">
                  <strong>{r.merchantDisplay}</strong>
                  <span>
                    → {r.category} · {counts.get(r.merchantNormalized) ?? 0} txns ·{' '}
                    {r.hitCount} {r.hitCount === 1 ? 'correction' : 'corrections'} ·{' '}
                    {dayMonth(r.updatedAt)}
                  </span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteRule(r.id)} aria-label={`Delete rule for ${r.merchantDisplay}`}>
                  <Trash2 size={16} />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="page-foot-hint">
        <ListChecks size={14} /> Rules apply to future detected transactions too — not just
        the ones already stored.
      </div>
    </div>
  );
}
