import { useMerchantVisual } from '@/components/icons';
import { dayMonth, formatMoney, timeLabel } from '@/utils/format';
import type { Transaction, TransactionSource } from '@/types';

const AUTO_HINT: Partial<Record<TransactionSource, string>> = {
  sms: 'from bank SMS',
  notification: 'from notification',
};

/** One quiet line in the money timeline — dot, merchant, context, amount. */
export function TransactionRow({
  txn,
  onClick,
  showDate = false,
}: {
  txn: Transaction;
  onClick: () => void;
  showDate?: boolean;
}) {
  const { color } = useMerchantVisual(txn);
  const credit = txn.type === 'credit';
  const hint = AUTO_HINT[txn.source];

  return (
    <button type="button" className="txn-row" onClick={onClick}>
      <span className="txn-dot" style={{ background: color }} aria-hidden />
      <span className="txn-info">
        <span className="txn-merchant">{txn.merchant}</span>
        <span className="txn-sub">
          {txn.category} · {timeLabel(txn.transactionDate)}
          {showDate ? `, ${dayMonth(txn.transactionDate)}` : ''}
          {hint ? ` · ${hint}` : ''}
        </span>
      </span>
      <span className={`txn-amount ${credit ? 'is-credit' : ''}`}>
        {credit ? '+' : '−'}
        {formatMoney(txn.amountMinor)}
      </span>
    </button>
  );
}
