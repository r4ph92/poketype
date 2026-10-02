import type { ReactNode } from 'react';

export const endSessionPath = '/logout';

export function EndSessionForm({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <form method="post" action={endSessionPath} className={className}>
      {children}
    </form>
  );
}
