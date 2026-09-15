import type { ReactNode } from 'react';

/** Small-caps section label with an optional quiet action on the right. */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h3 className="section-title">{title}</h3>
      {action}
    </div>
  );
}
