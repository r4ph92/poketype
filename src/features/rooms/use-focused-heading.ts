'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { usePageTitle } from './use-page-title';

// A view that replaces the one holding focus names the new page and moves focus to its heading.
// A view that may also be the first one loaded passes isReplacingView, so a fresh page keeps the browser's own focus.
export function useFocusedHeading(pageTitle: string, isReplacingView = true): RefObject<HTMLHeadingElement | null> {
  const headingRef = useRef<HTMLHeadingElement>(null);
  usePageTitle(pageTitle);
  useEffect(() => {
    if (isReplacingView) headingRef.current?.focus();
  }, [pageTitle, isReplacingView]);
  return headingRef;
}
