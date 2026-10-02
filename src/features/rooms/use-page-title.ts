'use client';

import { useEffect } from 'react';

// The room page swaps views without navigating, so each view names the page itself.
export function usePageTitle(pageTitle: string): void {
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);
}
