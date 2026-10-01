'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { PendingDots } from './PendingDots';

export type ButtonVariant = 'primary' | 'secondary';

type ButtonFaceProps = { variant: ButtonVariant; pending: boolean; children: ReactNode };

type PixelButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  type?: 'button' | 'submit';
  pending?: boolean;
  onClick?: () => void;
};

type PixelLinkProps = { href: string; children: ReactNode; variant?: ButtonVariant };

const controlClass: Record<ButtonVariant, string> = {
  primary: 'group inline-flex min-h-12 max-w-full items-stretch justify-self-start',
  secondary: 'group inline-flex min-h-11 max-w-full items-stretch justify-self-start',
};

const faceBaseClass =
  'pixel-notch flex flex-1 items-center justify-center gap-2 border-4 px-5 py-1 text-center font-pixel text-base font-semibold uppercase tracking-[0.06em]';

const idleFaceClass: Record<ButtonVariant, string> = {
  primary:
    'pixel-hairline border-frame bg-ink text-cream group-hover:[--hairline-color:var(--color-gold)] group-active:translate-y-0.5 group-active:[--hairline-color:var(--color-ink)]',
  secondary: 'border-frame bg-cream text-ink group-hover:bg-cream-deep group-active:translate-y-0.5',
};

const pendingFaceClass = 'cursor-progress border-slate bg-cream-deep text-muted';

// The notch lives on the inner face: clip-path on the button itself would cut off its focus outline.
function ButtonFace({ variant, pending, children }: ButtonFaceProps) {
  return (
    <span className={`${faceBaseClass} ${pending ? pendingFaceClass : idleFaceClass[variant]}`}>
      <span className={variant === 'primary' ? 'marker-next' : undefined}>{children}</span>
      {variant === 'primary' && <PendingDots isVisible={pending} />}
    </span>
  );
}

export function PixelButton({ children, variant = 'primary', type = 'button', pending = false, onClick }: PixelButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    if (pending) {
      event.preventDefault();
      return;
    }
    onClick?.();
  }

  return (
    <button type={type} aria-disabled={pending || undefined} onClick={handleClick} className={controlClass[variant]}>
      <ButtonFace variant={variant} pending={pending}>
        {children}
      </ButtonFace>
    </button>
  );
}

export function PixelLink({ href, children, variant = 'secondary' }: PixelLinkProps) {
  return (
    <Link href={href} className={controlClass[variant]}>
      <ButtonFace variant={variant} pending={false}>
        {children}
      </ButtonFace>
    </Link>
  );
}
