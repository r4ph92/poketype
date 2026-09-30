'use client';

import { usePathname } from 'next/navigation';

export function ReturnPathField() {
  return <input type="hidden" name="returnTo" value={usePathname()} />;
}
