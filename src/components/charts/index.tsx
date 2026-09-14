import type { CSSProperties } from 'react';
import './charts.css';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  slices,
  size = 176,
  thickness = 18,
  centerValue,
  centerLabel,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2 - 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Spending by category">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {total > 0 &&
          slices.map((s, i) => {
            const frac = s.value / total;
            const len = Math.max(frac * c - 2, 0.001);
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-acc * c}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            acc += frac;
            return el;
          })}
      </svg>
      {centerValue || centerLabel ? (
        <div className="donut-center">
          {centerValue ? <strong className="donut-value">{centerValue}</strong> : null}
          {centerLabel ? <span className="donut-label">{centerLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export interface Bar {
  label?: string;
  value: number;
  highlight?: boolean;
}

export function BarChart({
  bars,
  height = 64,
  showLabels = false,
}: {
  bars: Bar[];
  height?: number;
  showLabels?: boolean;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="barchart" style={{ '--bar-h': `${height}px` } as CSSProperties}>
      {bars.map((b, i) => (
        <div
          key={i}
          className="barchart-col"
          title={b.label ? `${b.label}: ₹${Math.round(b.value / 100).toLocaleString('en-IN')}` : undefined}
        >
          <div
            className={`barchart-bar ${b.highlight ? 'is-hot' : ''}`}
            style={{ height: `${Math.max((b.value / max) * 100, b.value > 0 ? 5 : 2)}%` }}
          />
          {showLabels && b.label ? <span className="barchart-label">{b.label}</span> : null}
        </div>
      ))}
    </div>
  );
}
