'use client';

import { useEffect, type RefObject } from 'react';

const marginPixels = 16;

type StyledElement = { style: { scrollPaddingBottom: string; paddingBottom: string } };

// The room kept free under the page for a card of this height, with its margin above and below.
export function reservedBottomSpace(cardHeight: number): string {
  return `${cardHeight + marginPixels * 2}px`;
}

// The root's scroll padding makes the browser scroll a focused control above the card; the body padding gives the page room to scroll.
export function reserveBottomSpace(root: StyledElement, body: StyledElement, space: string): void {
  root.style.scrollPaddingBottom = space;
  body.style.paddingBottom = space;
}

// A card fixed over the page bottom: while it shows, no focused control hides under it (WCAG 2.4.11).
export function useReservedBottomSpace(isOpen: boolean, card: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = card.current;
    if (!isOpen || !element) return;
    const reserve = () => reserveBottomSpace(document.documentElement, document.body, reservedBottomSpace(element.offsetHeight));
    reserve();
    const observer = new ResizeObserver(reserve);
    observer.observe(element);
    return () => {
      observer.disconnect();
      reserveBottomSpace(document.documentElement, document.body, '');
    };
  }, [isOpen, card]);
}
