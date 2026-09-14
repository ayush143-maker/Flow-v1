import { useState } from 'react';
import { Delete } from 'lucide-react';

export function PinPad({
  onComplete,
  shakeKey,
}: {
  onComplete: (pin: string) => void;
  shakeKey: number;
}) {
  const [digits, setDigits] = useState('');

  const tap = (d: string) => {
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) {
      window.setTimeout(() => onComplete(next), 120);
    }
  };

  return (
    <div className="pinpad" key={shakeKey}>
      <div className="pin-dots" aria-label="PIN entry">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-dot ${i < digits.length ? 'is-filled' : ''}`} />
        ))}
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button type="button" key={d} className="key" onClick={() => tap(d)}>
            {d}
          </button>
        ))}
        <span className="key key--blank" />
        <button type="button" className="key" onClick={() => tap('0')}>
          0
        </button>
        <button
          type="button"
          className="key key--del"
          onClick={() => setDigits((p) => p.slice(0, -1))}
          aria-label="Delete digit"
        >
          <Delete size={21} />
        </button>
      </div>
    </div>
  );
}
