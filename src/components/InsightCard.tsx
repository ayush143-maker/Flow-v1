import type { ReactNode } from 'react';

export type InsightTone = 'positive' | 'negative' | 'neutral' | 'info';

/**
 * A human-readable insight — one sentence in large, calm type on a pastel
 * surface. Flow explaining the user's money, not listing statistics.
 */
export function InsightCard({
  tone = 'neutral',
  title,
  detail,
  icon,
}: {
  tone?: InsightTone;
  title: string;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={`insight-card insight-card--${tone}`}>
      {icon ? <span className="insight-card-icon">{icon}</span> : null}
      <div>
        <p className="insight-card-title">{title}</p>
        {detail ? <p className="insight-card-detail">{detail}</p> : null}
      </div>
    </div>
  );
}
