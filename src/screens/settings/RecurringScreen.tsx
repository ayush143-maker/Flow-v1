import { useMemo } from 'react';
import { ChevronRight, Repeat } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { MerchantAvatar } from '@/components/icons';
import { EmptyState, ScreenHeader } from '@/components/ui';
import { detectRecurring, monthlyEquivalentMinor } from '@/services/analytics/recurring';
import { dayMonth, formatMoney, formatMoneyCompact } from '@/utils/format';

const FREQ_LABEL: Record<string, string> = {
  weekly: 'week',
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
};

export function RecurringScreen() {
  const { transactions } = useAppStore();
  const nav = useNav();
  const recurring = useMemo(() => detectRecurring(transactions), [transactions]);
  const monthly = recurring.reduce((s, r) => s + monthlyEquivalentMinor(r), 0);

  return (
    <div className="pad">
      <ScreenHeader title="Recurring payments" onBack={nav.pop} />

      {recurring.length === 0 ? (
        <EmptyState
          icon={<Repeat size={24} />}
          title="No recurring payments detected yet"
          body="Flow detects them automatically once a merchant charges you a similar amount on a regular cycle."
        />
      ) : (
        <>
          <div className="rec-hero">
            <strong>{formatMoneyCompact(monthly)}</strong>
            <span>/ month total · {recurring.length} detected</span>
          </div>

          <div className="card">
            {recurring.map((r) => {
              const sample = transactions.find(
                (t) => t.merchantNormalized === r.id.replace('rp_', ''),
              );
              return (
                <div key={r.id} className="rec-row">
                  {sample ? (
                    <MerchantAvatar txn={sample} size={40} />
                  ) : (
                    <span className="rec-fallback-icon">
                      <Repeat size={19} />
                    </span>
                  )}
                  <div className="rule-body">
                    <strong>{r.merchant}</strong>
                    <span>
                      {formatMoney(r.amountMinor)} / {FREQ_LABEL[r.frequency]}
                    </span>
                  </div>
                  <div className="rec-next">
                    <span>Next: {dayMonth(r.nextExpected ?? r.lastSeen)}</span>
                    {r.isEstimate && <span className="est-chip">Estimate</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="page-foot-hint">
            <ChevronRight size={14} /> Detected from your history. Dates are estimates
            until more billing cycles are observed.
          </p>
        </>
      )}
    </div>
  );
}
