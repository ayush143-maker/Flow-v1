import { useMemo } from 'react';
import {
  ArrowLeftRight, Banknote, Briefcase, Car, Dumbbell, Film, Fuel, GraduationCap,
  HeartPulse, Landmark, Music, Pill, Plane, Play, Receipt, Repeat, RotateCcw,
  Shapes, ShoppingBag, ShoppingBasket, ShoppingCart, Smartphone, Store, TrainFront,
  Tv, UtensilsCrossed, Wallet, Zap, type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { categoryColor } from '@/theme/tokens';
import type { Transaction } from '@/types';

export const ICONS: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  shopping: ShoppingBag,
  travel: Plane,
  bills: Receipt,
  entertainment: Film,
  health: HeartPulse,
  education: GraduationCap,
  groceries: ShoppingBasket,
  subscriptions: Repeat,
  cash: Banknote,
  transfers: ArrowLeftRight,
  others: Shapes,
  car: Car,
  train: TrainFront,
  smartphone: Smartphone,
  tv: Tv,
  music: Music,
  play: Play,
  dumbbell: Dumbbell,
  pill: Pill,
  fuel: Fuel,
  zap: Zap,
  cart: ShoppingCart,
  store: Store,
  briefcase: Briefcase,
  refund: RotateCcw,
  landmark: Landmark,
  wallet: Wallet,
};

export function getIcon(name?: string): LucideIcon {
  return (name && ICONS[name]) || ICONS.others;
}

/** merchantNormalized → icon key (spaces wale keys quoted hain — TS rule) */
const MERCHANT_ICON: Record<string, string> = {
  SWIGGY: 'food',
  ZOMATO: 'food',
  UBER: 'car',
  OLA: 'car',
  AMAZON: 'shopping',
  FLIPKART: 'shopping',
  MYNTRA: 'shopping',
  BIGBASKET: 'cart',
  BLINKIT: 'cart',
  DMART: 'store',
  JIO: 'smartphone',
  AIRTEL: 'smartphone',
  NETFLIX: 'tv',
  SPOTIFY: 'music',
  'YOUTUBE PREMIUM': 'play',
  'GOLDS GYM': 'dumbbell',
  'APOLLO PHARMACY': 'pill',
  IRCTC: 'train',
  'INDIAN OIL': 'fuel',
  'BSES RAJDHANI': 'zap',
  ATM: 'cash',
  'UPI TRANSFER': 'transfers',
  'SALARY CREDIT': 'briefcase',
  'AMAZON REFUND': 'refund',
  'PHONEPE CASHBACK': 'wallet',
  'IMPS CREDIT': 'landmark',
};

function tint(color: string, alpha: number): string {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16) || 0xa8ada8;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Visual identity for a transaction's merchant.
 * Default categories render with the design-system palette; only custom
 * categories use their stored color (old DB seed colors stay dormant).
 */
export function useMerchantVisual(txn: Transaction): { icon: string; color: string } {
  const { categories } = useAppStore();
  return useMemo(() => {
    const cat = categories.find((c) => c.name === txn.category);
    const color = cat && cat.isCustom ? cat.color : categoryColor(txn.category);
    return {
      icon: MERCHANT_ICON[txn.merchantNormalized] ?? cat?.icon ?? 'others',
      color,
    };
  }, [categories, txn.merchantNormalized, txn.category]);
}

export function MerchantAvatar({
  txn,
  size = 42,
}: {
  txn: Transaction;
  size?: number;
}) {
  const visual = useMerchantVisual(txn);
  const Icon = getIcon(visual.icon);
  return (
    <span
      className="m-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.33),
        background: tint(visual.color, 0.14),
        color: visual.color,
      }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={1.9} />
    </span>
  );
}
