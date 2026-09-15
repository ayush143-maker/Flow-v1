import type { LucideIcon } from 'lucide-react';
import { formatMoney } from '@/utils/format';

function withAlpha(color: string, alpha: number): string {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16) || 0xa8ada8;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Pastel category block — icon in a white disc, name, amount, share. */
export function CategoryCard({
  icon: Icon,
  name,
  color,
  amountMinor,
  share,
  onClick,
}: {
  icon: LucideIcon;
  name: string;
  color: string;
  amountMinor: number;
  share: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="catcard"
      style={{ background: withAlpha(color, 0.1) }}
      onClick={onClick}
    >
      <span className="catcard-icon" style={{ color }}>
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <span className="catcard-body">
        <span className="catcard-name">{name}</span>
        <strong className="catcard-amount">{formatMoney(amountMinor)}</strong>
      </span>
      <span className="catcard-share">{Math.round(share * 100)}%</span>
    </button>
  );
}
