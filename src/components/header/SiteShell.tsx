import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SkipLink } from './SkipLink';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      {children}
    </>
  );
}
