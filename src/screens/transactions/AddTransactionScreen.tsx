import { useMemo, useState } from 'react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { Chip, ScreenHeader, SegmentedControl } from '@/components/ui';
import { PrimaryButton } from '@/components/PrimaryButton';
import { newId, normalizeMerchant } from '@/utils/format';
import { sha256Hex } from '@/utils/hash';
import type { PaymentMethod, Transaction, TransactionType } from '@/types';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'netbanking', label: 'Netbanking' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'unknown', label: 'Other' },
];

function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function AddTransactionScreen() {
  const { categories, addManualTransaction } = useAppStore();
  const nav = useNav();

  const today = useMemo(todayLocal, []);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Others');
  const [dateStr, setDateStr] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [type, setType] = useState<TransactionType>('debit');

  const amountMinor = useMemo(() => {
    const cleaned = amount.replace(/[₹,\s]/g, '');
    const v = parseFloat(cleaned);
    return Number.isFinite(v) ? Math.round(v * 100) : 0;
  }, [amount]);

  const valid = amountMinor > 0 && merchant.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    const id = newId('t');
    const now = new Date();
    const when = new Date(`${dateStr}T${now.toTimeString().slice(0, 5)}`);
    const iso = (Number.isNaN(when.getTime()) ? now : when).toISOString();

    const txn: Transaction = {
      id,
      amountMinor,
      currency: 'INR',
      merchant: merchant.trim(),
      merchantNormalized: normalizeMerchant(merchant.trim()),
      category,
      type,
      source: 'manual',
      paymentMethod: method,
      accountHint: null,
      transactionDate: iso,
      createdAt: now.toISOString(),
      originalMessage: null,
      messageHash: await sha256Hex(`manual|${id}|${iso}`),
      referenceId: null,
      isTestData: false,
      metadata: null,
    };

    addManualTransaction(txn);
    nav.pop();
  };

  return (
    <div className="pad">
      <ScreenHeader title="Add transaction" onBack={nav.pop} />

      <div className="add">
        <p className="add-label">How much?</p>
        <div className="add-amount">
          <span>₹</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            inputMode="decimal"
            placeholder="0"
            autoFocus
            aria-label="Amount"
          />
        </div>

        <SegmentedControl
          options={[
            { value: 'debit' as TransactionType, label: 'Debit' },
            { value: 'credit' as TransactionType, label: 'Credit' },
          ]}
          value={type}
          onChange={setType}
        />

        <p className="add-label">Where did you spend it?</p>
        <input
          className="input"
          value={merchant}
          maxLength={40}
          placeholder="Merchant or place"
          onChange={(e) => setMerchant(e.target.value)}
        />

        <p className="add-label">Category</p>
        <div className="add-chips">
          {categories.map((c) => (
            <Chip key={c.id} selected={category === c.name} onClick={() => setCategory(c.name)}>
              {c.name}
            </Chip>
          ))}
        </div>

        <p className="add-label">Date</p>
        <input
          className="input"
          type="date"
          value={dateStr}
          max={today}
          onChange={(e) => setDateStr(e.target.value || today)}
        />

        <p className="add-label">Payment method</p>
        <div className="add-chips">
          {METHODS.map((m) => (
            <Chip
              key={m.value}
              selected={method === m.value}
              onClick={() => setMethod(m.value)}
            >
              {m.label}
            </Chip>
          ))}
        </div>

        <div className="add-actions">
          <PrimaryButton disabled={!valid} onClick={() => void save()}>
            Save transaction
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
