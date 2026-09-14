import { MerchantAvatar } from '@/components/icons';
import { dayMonth, formatMoney, timeLabel } from '@/utils/format';
import type { Transaction } from '@/types';

export function TransactionRow({
  txn,
  onClick,
  showDate = false,
}: {
  txn: Transaction;
  onClick: () => void;
  showDate?: boolean;
}) {
  const credit = txn.type === 'credit';
  return (
    <button type="button" className="txn-row" onClick={onClick}>
      <MerchantAvatar txn={txn} />
      <span className="txn-info">
        <span className="txn-merchant">{txn.merchant}</span>
        <span className="txn-sub">
          {txn.category} · {showDate ? `${dayMonth(txn.transactionDate)}, ` : ''}
          {timeLabel(txn.transactionDate)}
        </span>
      </span>
      <span className={`txn-amount ${credit ? 'is-credit' : ''}`}>
        {credit ? '+' : ''}
        {formatMoney(txn.amountMinor)}
      </span>
    </button>
  );
}
