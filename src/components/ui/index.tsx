import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import './ui.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`];
  if (block) classes.push('btn--block');
  if (className) classes.push(className);
  return (
    <button
      type="button"
      className={classes.join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="btn-spinner" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`chip ${selected ? 'is-on' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`segmented-item ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        {title ? <h3 className="sheet-title">{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}

/**
 * Empty state with a small abstract illustration — quiet, never generic.
 * `icon` is optional and overlays the illustration when provided.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-visual" aria-hidden>
        <svg viewBox="0 0 96 96" width="88" height="88">
          <circle cx="38" cy="44" r="26" fill="var(--lavender)" />
          <circle cx="58" cy="52" r="22" fill="var(--mint)" />
          <circle cx="64" cy="34" r="14" fill="var(--soft-blue)" />
          <path d="M20 70 A32 32 0 0 0 78 62" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="49" cy="47" r="4.5" fill="var(--ink)" />
        </svg>
        {icon ? <span className="empty-icon">{icon}</span> : null}
      </div>
      <h4 className="empty-title">{title}</h4>
      {body ? <p className="empty-body">{body}</p> : null}
      {action}
    </div>
  );
}

export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="screen-header">
      {onBack ? (
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Go back">
          <ChevronLeft size={22} />
        </button>
      ) : (
        <span className="screen-header-spacer" />
      )}
      <h2 className="screen-header-title">{title}</h2>
      {right ?? <span className="screen-header-spacer" />}
    </header>
  );
}
