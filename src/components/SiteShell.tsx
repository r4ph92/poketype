import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
