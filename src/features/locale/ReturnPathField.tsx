'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export function ReturnPathField() {
  const pathname = usePathname();
  return (
    <Suspense fallback={<HiddenReturnPath value={pathname} />}>
      <CurrentAddressField />
    </Suspense>
  );
}

function CurrentAddressField() {
  const search = useSearchParams().toString();
  const pathname = usePathname();
  return <HiddenReturnPath value={search ? `${pathname}?${search}` : pathname} />;
}

function HiddenReturnPath({ value }: { value: string }) {
  return <input type="hidden" name="returnTo" value={value} />;
}
