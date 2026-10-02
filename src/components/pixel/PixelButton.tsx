'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { PendingDots } from './PendingDots';

export type ButtonVariant = 'primary' | 'secondary';

type FaceState = 'idle' | 'pending' | 'unavailable';

type ButtonFaceProps = { variant: ButtonVariant; state: FaceState; children: ReactNode };

type PixelButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  type?: 'button' | 'submit';
  pending?: boolean;
  unavailable?: boolean;
  describedBy?: string;
  onClick?: () => void;
  submission?: { name: string; value: string };
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

const inactiveFaceClass = 'border-slate bg-cream-deep text-muted';

const stateFaceClass: Record<Exclude<FaceState, 'idle'>, string> = {
  pending: `${inactiveFaceClass} cursor-progress`,
  unavailable: `${inactiveFaceClass} cursor-not-allowed`,
};

function faceState(pending: boolean, unavailable: boolean): FaceState {
  if (pending) return 'pending';
  return unavailable ? 'unavailable' : 'idle';
}

// The notch lives on the inner face: clip-path on the button itself would cut off its focus outline.
function ButtonFace({ variant, state, children }: ButtonFaceProps) {
  return (
    <span className={`${faceBaseClass} ${state === 'idle' ? idleFaceClass[variant] : stateFaceClass[state]}`}>
      <span className={variant === 'primary' ? 'marker-next' : undefined}>{children}</span>
      {variant === 'primary' && <PendingDots isVisible={state === 'pending'} />}
    </span>
  );
}

// aria-disabled keeps an inactive button focusable, so its reason stays readable; clicks are ignored instead.
export function PixelButton({ children, variant = 'primary', type = 'button', pending = false, unavailable = false, describedBy, onClick, submission }: PixelButtonProps) {
  const state = faceState(pending, unavailable);

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    if (state !== 'idle') {
      event.preventDefault();
      return;
    }
    onClick?.();
  }

  return (
    <button type={type} name={submission?.name} value={submission?.value} aria-disabled={state !== 'idle'} aria-describedby={describedBy} onClick={handleClick} className={controlClass[variant]}>
      <ButtonFace variant={variant} state={state}>
        {children}
      </ButtonFace>
    </button>
  );
}

export function PixelLink({ href, children, variant = 'secondary' }: PixelLinkProps) {
  return (
    <Link href={href} className={controlClass[variant]}>
      <ButtonFace variant={variant} state="idle">
        {children}
      </ButtonFace>
    </Link>
  );
}
