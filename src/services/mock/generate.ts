import { MERCHANTS, ACCOUNTS, type MerchantSpec } from './merchants';
import type { MerchantRule, Transaction, TransactionMetadata } from '@/types';
import { addDays, fnv1a, newId, normalizeMerchant, startOfDay } from '@/utils/format';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rupees(amountMinor: number): string {
  return (amountMinor / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function digits(rng: () => number, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(rng() * 10);
  return s;
}

/** Bank-style message templates — same formats the Kotlin parser will read. */
function messageFor(spec: MerchantSpec, amountMinor: number, date: Date, ref: string): string {
  const d = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const name = spec.name.toUpperCase();
  const amt = rupees(amountMinor);
  if (spec.method === 'atm') {
    return `Rs.${amt} withdrawn from ATM DEL01234 A/c XX1234 on ${d}.`;
  }
  if (spec.credit && spec.method === 'bank_transfer') {
    return `Your A/c XX1234 is credited with Rs.${amt} (NEFT/IMPS) on ${d}.`;
  }
  if (spec.credit && spec.method === 'card') {
    return `Rs.${amt} refunded to your HDFC Bank Credit Card ending 4321 from ${name}.`;
  }
  if (spec.credit && spec.method === 'wallet') {
    return `Your wallet is credited with Rs.${amt}. Ref ${ref}.`;
  }
  if (spec.credit && spec.method === 'upi') {
    return `Your A/c XX1234 credited Rs.${amt} by ${name} (UPI) on ${d}. Ref ${ref}.`;
  }
  if (spec.method === 'upi') {
    return `INR ${amt} debited from A/c XX1234 at ${name} on ${d}. UPI Ref ${ref}.`;
  }
  if (spec.method === 'card') {
    return `INR ${amt} spent on your HDFC Bank Credit Card ending 4321 at ${name} on ${d}.`;
  }
  if (spec.method === 'netbanking') {
    return `Rs.${amt} debited from A/c XX1234 (${name}) on ${d}. Ref ${ref}.`;
  }
  return `Rs.${amt} paid to ${name} on ${d}. Ref ${ref}.`;
}

function buildTxn(
  spec: MerchantSpec,
  date: Date,
  amountMinor: number,
  rng: () => number,
  rules: Map<string, string>,
  isTest: boolean,
): Transaction {
  const ref = spec.method === 'upi' ? `UPI${digits(rng, 12)}` : `TXN${digits(rng, 8)}`;
  const hour = 8 + Math.floor(rng() * 14);
  const minute = Math.floor(rng() * 60);
  const when = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
  const iso = when.toISOString();
  const message = messageFor(spec, amountMinor, when, ref);
  const useCard = spec.method === 'card';
  const account = useCard ? ACCOUNTS.card : ACCOUNTS.savings;
  const metadata: TransactionMetadata = { bank: account.bank, instrument: account.instrument };
  if (spec.method === 'upi' && !spec.credit) {
    metadata.upiVpa = `${normalizeMerchant(spec.name).replace(/\s+/g, '').toLowerCase()}@ybl`;
  }
  const merchantNormalized = normalizeMerchant(spec.name);
  // A third of quick UPI debits also surface as app notifications (dedup lands in Phase 6).
  const source = spec.method === 'upi' && !spec.credit && rng() < 0.33 ? 'notification' : 'sms';
  return {
    id: newId('t'),
    amountMinor,
    currency: 'INR',
    merchant: spec.name,
    merchantNormalized,
    category: rules.get(merchantNormalized) ?? spec.category,
    type: spec.credit ? 'credit' : 'debit',
    source: isTest ? 'test' : source,
    paymentMethod: spec.method,
    accountHint: account.hint,
    transactionDate: iso,
    createdAt: iso,
    originalMessage: message,
    messageHash: fnv1a(`${merchantNormalized}|${amountMinor}|${iso.slice(0, 10)}|${ref}`),
    referenceId: ref,
    isTestData: isTest,
    metadata,
  };
}

/** Deterministic realistic dataset for the last N days. */
export function generateMockTransactions(
  days = 120,
  seed = 20251031,
  rules: MerchantRule[] = [],
): Transaction[] {
  const rng = mulberry32(seed);
  const ruleMap = new Map(rules.map((r) => [r.merchantNormalized, r.category]));
  const out: Transaction[] = [];
  const today = startOfDay(new Date());

  for (let d = days - 1; d >= 0; d--) {
    const day = addDays(today, -d);
    const dom = day.getDate();
    for (const spec of MERCHANTS) {
      if (spec.recurringDay !== undefined) {
        if (dom === spec.recurringDay) {
          out.push(buildTxn(spec, day, spec.fixedMinor ?? spec.minMinor, rng, ruleMap, false));
        }
      } else if (rng() < spec.perMonth / 30) {
        const amount = Math.round((spec.minMinor + rng() * (spec.maxMinor - spec.minMinor)) / 100) * 100;
        out.push(buildTxn(spec, day, amount, rng, ruleMap, false));
      }
    }
  }

  return out.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
}

/** Developer Tools — burst of recent test transactions, clearly flagged. */
export function generateTestTransactions(count = 50, rules: MerchantRule[] = []): Transaction[] {
  const rng = mulberry32(Date.now() & 0xffffffff);
  const ruleMap = new Map(rules.map((r) => [r.merchantNormalized, r.category]));
  const pool = MERCHANTS.filter((m) => m.recurringDay === undefined);
  const out: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    const spec = pool[Math.floor(rng() * pool.length)];
    const day = addDays(startOfDay(new Date()), -Math.floor(rng() * 10));
    const amount = Math.round((spec.minMinor + rng() * (spec.maxMinor - spec.minMinor)) / 100) * 100;
    out.push(buildTxn(spec, day, amount, rng, ruleMap, true));
  }
  return out.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
}
