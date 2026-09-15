import { formatMoney } from '@/utils/format';

export interface SpendSlice {
  category: string;
  amountMinor: number;
  share: number;
  color: string;
}

/**
 * Elegant spending distribution: one soft horizontal track with proportional
 * pastel segments, and a quiet legend beneath. No pie, no rainbow.
 */
export function SpendingChart({ slices }: { slices: SpendSlice[] }) {
  if (slices.length === 0) return null;
  return (
    <div className="spendchart">
      <div className="spendchart-track" role="img" aria-label="Spending distribution by category">
        {slices.map((s, i) => (
          <span
            key={s.category}
            className="spendchart-seg"
            style={
              {
                width: `${Math.max(s.share * 100, 2)}%`,
                background: s.color,
                '--i': String(i),
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <ul className="spendchart-legend stagger">
        {slices.map((s, i) => (
          <li key={s.category} style={{ '--i': String(i) } as React.CSSProperties}>
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-name">{s.category}</span>
            <span className="legend-share">{Math.round(s.share * 100)}%</span>
            <span className="legend-val">{formatMoney(s.amountMinor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
