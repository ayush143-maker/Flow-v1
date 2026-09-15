import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { getIcon } from '@/components/icons';
import { EmptyState, ScreenHeader, Sheet } from '@/components/ui';
import { dateShort, formatMoney, timeLabel } from '@/utils/format';
import type { PaymentMethod, TransactionSource } from '@/types';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Netbanking',
  atm: 'ATM',
  wallet: 'Wallet',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  unknown: '—',
};

const SOURCE_LABEL: Record<TransactionSource, string> = {
  sms: 'Bank SMS',
  notification: 'App notification',
  manual: 'Added manually',
  test: 'Test data',
};

const AUTO_SOURCES: TransactionSource[] = ['sms', 'notification'];

export function TransactionDetailScreen({ id }: { id: string }) {
  const { transactions, categories, rules, applyCategory } = useAppStore();
  const nav = useNav();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const txn = useMemo(() => transactions.find((t) => t.id === id), [transactions, id]);
  const rule = useMemo(
    () => (txn ? rules.find((r) => r.merchantNormalized === txn.merchantNormalized) : undefined),
    [rules, txn],
  );

  if (!txn) {
    return (
      <div className="pad">
        <ScreenHeader title="Transaction" onBack={nav.pop} />
        <EmptyState
          title="Transaction not found"
          body="It may have been removed."
        />
      </div>
    );
  }

  const credit = txn.type === 'credit';
  const automatic = AUTO_SOURCES.includes(txn.source);
  const paymentSource = txn.metadata?.bank ?? METHOD_LABEL[txn.paymentMethod ?? 'unknown'];

  const pickCategory = (name: string) => {
    applyCategory(txn.id, name);
    setSheetOpen(false);
    setSavedNote(`Saved — future ${txn.merchant} transactions will be categorized as ${name}.`);
  };

  return (
    <div className="pad detail">
      <ScreenHeader title="Transaction" onBack={nav.pop} />

      <div className="detail-hero rise">
        <strong className={`detail-amount ${credit ? 'is-credit' : ''}`}>
          {credit ? '+' : '−'}
          {formatMoney(txn.amountMinor)}
        </strong>
        <h2 className="detail-merchant">{txn.merchant}</h2>
        <p className="detail-sub">
          {txn.category} · {dateShort(new Date(txn.transactionDate))} ·{' '}
          {timeLabel(txn.transactionDate)}
        </p>
        {automatic && <span className="auto-chip">Automatically detected</span>}
      </div>

      {savedNote && <div className="saved-note">{savedNote}</div>}

      <div className="card detail-list">
        <div className="detail-row">
          <span>Payment source</span>
          <span className="detail-row-value">{paymentSource}</span>
        </div>
        <div className="detail-row">
          <span>Detected from</span>
          <span className="detail-row-value">{SOURCE_LABEL[txn.source]}</span>
        </div>
        <button type="button" className="detail-row" onClick={() => setSheetOpen(true)}>
          <span>Category</span>
          <span className="detail-row-value">{txn.category}</span>
        </button>
        {rule && (
          <div className="detail-row">
            <span>Merchant rule</span>
            <span className="detail-row-value">
              <span className="rule-pill">Rule active · → {rule.category}</span>
            </span>
          </div>
        )}
        {txn.accountHint && (
          <div className="detail-row">
            <span>Account</span>
            <span className="detail-row-value">{txn.accountHint}</span>
          </div>
        )}
        {txn.metadata?.instrument && (
          <div className="detail-row">
            <span>Instrument</span>
            <span className="detail-row-value">{txn.metadata.instrument}</span>
          </div>
        )}
        {txn.metadata?.upiVpa && (
          <div className="detail-row">
            <span>UPI VPA</span>
            <span className="detail-row-value detail-mono">{txn.metadata.upiVpa}</span>
          </div>
        )}
        {txn.referenceId && (
          <div className="detail-row">
            <span>Reference ID</span>
            <span className="detail-row-value detail-mono">{txn.referenceId}</span>
          </div>
        )}
      </div>

      {txn.originalMessage && (
        <div className="card detail-msg-card">
          <h4 className="detail-msg-title">Original message</h4>
          <p className="detail-msg">{txn.originalMessage}</p>
        </div>
      )}

      <p className="detail-foot">
        Wrong category? Tap “Category” — Flow remembers the correction for{' '}
        {txn.merchant} from now on.
      </p>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Change category">
        <ul className="cat-picker">
          {categories.map((c) => {
            const Icon = getIcon(c.icon);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`cat-picker-row ${txn.category === c.name ? 'is-on' : ''}`}
                  onClick={() => pickCategory(c.name)}
                >
                  <span
                    className="cat-picker-icon"
                    style={{ background: `${c.isCustom ? c.color : '#A8ADA8'}22`, color: c.isCustom ? c.color : '#737373' }}
                  >
                    <Icon size={18} />
                  </span>
                  <span>{c.name}</span>
                  {txn.category === c.name && <Check size={18} className="cat-picker-check" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </div>
  );
}
