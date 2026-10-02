'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { usePageTitle } from './use-page-title';

// A view that replaces the one holding focus names the new page and moves focus to its heading.
export function useFocusedHeading(pageTitle: string): RefObject<HTMLHeadingElement | null> {
  const headingRef = useRef<HTMLHeadingElement>(null);
  usePageTitle(pageTitle);
  useEffect(() => {
    headingRef.current?.focus();
  }, [pageTitle]);
  return headingRef;
}
