import type { ReactNode } from 'react';
import { CurrentPageLink } from './CurrentPageLink';

type NavTabProps = { href: string; activePaths: readonly string[]; icon: ReactNode; label: string };

export const navTabFaceClass =
  'pixel-frame-thin pixel-notch flex flex-1 items-center gap-2 bg-cream px-3 font-pixel text-base font-semibold uppercase tracking-[0.06em] text-ink group-hover:bg-cream-deep group-aria-[current=page]:bg-gold group-aria-[current=page]:text-on-gold group-aria-[current=page]:marker-next';

export function NavTab({ href, activePaths, icon, label }: NavTabProps) {
  return (
    <CurrentPageLink href={href} activePaths={activePaths} className="group inline-flex min-h-11 min-w-0 items-stretch">
      <span className={navTabFaceClass}>
        {icon}
        <span className="min-w-0">{label}</span>
      </span>
    </CurrentPageLink>
  );
}
