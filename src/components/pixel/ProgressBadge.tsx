import type { ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'host' | 'you' | 'ready' | 'waiting' | 'disconnected';

const variantClass: Record<BadgeVariant, string> = {
  neutral: 'bg-cream text-ink',
  host: 'bg-cream text-ink marker-host',
  you: 'bg-ink text-cream',
  ready: 'bg-cream text-success marker-check',
  waiting: 'bg-cream text-muted',
  disconnected: 'bg-cream text-error',
};

export function ProgressBadge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span
      className={`pixel-frame-thin pixel-notch inline-flex shrink-0 items-center px-2 font-pixel text-sm font-semibold uppercase tracking-[0.06em] ${variantClass[variant]}`}
    >
      {children}
    </span>
  );
}
