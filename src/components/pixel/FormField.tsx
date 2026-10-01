import type { ComponentProps, ReactNode } from 'react';
import { AlertIcon } from './icons/icons';

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block font-pixel text-base font-semibold">
      {children}
    </label>
  );
}

export function PixelInput(props: ComponentProps<'input'>) {
  return (
    <input
      {...props}
      className="block min-h-11 w-full min-w-0 border-2 border-frame bg-cream-deep px-3 text-base text-ink placeholder:text-muted aria-invalid:border-error aria-invalid:bg-error-soft"
    />
  );
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-sm text-muted">
      {children}
    </p>
  );
}

// Callers give it key={attempt}: the remount makes screen readers announce a repeated error again.
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 font-bold text-error">
      <AlertIcon />
      <span>{children}</span>
    </p>
  );
}
