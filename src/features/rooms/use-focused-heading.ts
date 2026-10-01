'use client';

import { useEffect, useRef, type RefObject } from 'react';

// A view that replaces the one holding focus names the new page and moves focus to its heading.
export function useFocusedHeading(pageTitle: string): RefObject<HTMLHeadingElement | null> {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = pageTitle;
    headingRef.current?.focus();
  }, [pageTitle]);
  return headingRef;
}
