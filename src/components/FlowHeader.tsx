import type { ReactNode } from 'react';

/** Editorial page header — muted eyebrow over a strong title, optional action. */
export function FlowHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="flow-header">
      <div>
        {eyebrow ? <p className="flow-eyebrow">{eyebrow}</p> : null}
        {title ? <h1 className="flow-title">{title}</h1> : null}
      </div>
      {right}
    </header>
  );
}
