import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** The one big near-black CTA used for decisive moments. */
export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
}) {
  return (
    <button type={type} className="primary-cta" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
