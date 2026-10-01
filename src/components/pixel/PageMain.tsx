import type { ReactNode } from 'react';

export function PageMain({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main id="content" tabIndex={-1} className={`mx-auto grid w-full content-start gap-4 px-4 py-4 ${wide ? 'max-w-[90rem]' : 'max-w-2xl'}`}>
      {children}
    </main>
  );
}
