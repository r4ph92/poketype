'use client';

import { useEffect, useRef, type RefObject } from 'react';

const caretSelector = '[data-state="current"], [data-state="rejected"]';

// The passage shows a few lines at a time; the line holding the caret always becomes the first one shown.
export function usePassageWindow(position: number): RefObject<HTMLParagraphElement | null> {
  const windowRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const passageWindow = windowRef.current;
    const caret = passageWindow?.querySelector<HTMLElement>(caretSelector);
    if (!passageWindow || !caret) return;
    const lineHeight = parseFloat(getComputedStyle(passageWindow).lineHeight);
    passageWindow.scrollTop = Math.floor(caret.offsetTop / lineHeight) * lineHeight;
  }, [position]);
  return windowRef;
}
