import type { ReactNode } from 'react';

export function PageMain({ children }: { children: ReactNode }) {
  return (
    <main id="content" tabIndex={-1} className="mx-auto grid w-full max-w-2xl content-start gap-4 px-4 py-4">
      {children}
    </main>
  );
}
