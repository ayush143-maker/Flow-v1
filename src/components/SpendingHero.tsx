import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMoney } from '@/utils/format';

/** Count-up animation that respects reduced-motion. */
function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/**
 * The financial state, front and center: month selector, oversized amount
 * and a quiet comparison line. Typography only — no card, no clutter.
 */
export function SpendingHero({
  amountMinor,
  deltaPercent,
  monthLabel,
  caption,
  onPrevMonth,
  onNextMonth,
  nextDisabled,
}: {
  amountMinor: number;
  deltaPercent: number | null;
  monthLabel: string;
  caption: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  nextDisabled: boolean;
}) {
  const animated = useCountUp(amountMinor);
  const down = deltaPercent !== null && deltaPercent < 0;

  return (
    <section className="hero" aria-label="Spending overview">
      <div className="hero-month">
        <button type="button" onClick={onPrevMonth} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <span>{monthLabel}</span>
        <button
          type="button"
          onClick={onNextMonth}
          disabled={nextDisabled}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <strong className="hero-amount">{formatMoney(animated)}</strong>

      <p className="hero-caption">
        {caption}
        {deltaPercent !== null && (
          <span className={`hero-delta ${down ? 'is-good' : 'is-bad'}`}>
            {down ? '↓' : '↑'} {Math.abs(deltaPercent)}% vs last month
          </span>
        )}
      </p>
    </section>
  );
}
