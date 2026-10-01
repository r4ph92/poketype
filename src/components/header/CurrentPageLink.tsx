'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type CurrentPageLinkProps = { href: string; activePaths: readonly string[]; className: string; children: ReactNode };

// Styles follow aria-current through aria-[current=page] variants, so the server parent never needs the pathname.
export function CurrentPageLink({ href, activePaths, className, children }: CurrentPageLinkProps) {
  const pathname = usePathname();
  const isCurrent = activePaths.some((path) => pathname.startsWith(path));
  return (
    <Link href={href} aria-current={isCurrent ? 'page' : undefined} className={className}>
      {children}
    </Link>
  );
}
