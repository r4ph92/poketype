'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { PixelButton } from './PixelButton';

type ToastProps = { isOpen: boolean; message: string; dismissLabel: string; onDismiss: () => void; action?: ReactNode };

const toastMarginPixels = 16;

// The live region stays mounted while the toast is closed, so screen readers announce the message when it appears.
export function Toast({ isOpen, message, dismissLabel, onDismiss, action }: ToastProps) {
  const card = useRef<HTMLDivElement>(null);
  useDismissOnEscape(isOpen, onDismiss);
  useReservedBottomSpace(isOpen, card);
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md">
      {isOpen && (
        <div ref={card} className="toast-card pixel-notch grid gap-3 border-4 border-frame bg-cream p-4 text-ink">
          <p className="font-bold">{message}</p>
          <div className="flex flex-wrap items-center gap-3">
            {action}
            <PixelButton variant="secondary" onClick={onDismiss}>{dismissLabel}</PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}

function useDismissOnEscape(isOpen: boolean, onDismiss: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    function dismissOnEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') onDismiss();
    }
    document.addEventListener('keydown', dismissOnEscape);
    return () => document.removeEventListener('keydown', dismissOnEscape);
  }, [isOpen, onDismiss]);
}

// The toast is fixed over the page bottom, so the page keeps that much room free and focused controls scroll above it (WCAG 2.4.11).
function useReservedBottomSpace(isOpen: boolean, card: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const element = card.current;
    if (!isOpen || !element) return;
    const root = document.documentElement;
    const reserve = () => {
      const space = `${element.offsetHeight + toastMarginPixels * 2}px`;
      root.style.scrollPaddingBottom = space;
      document.body.style.paddingBottom = space;
    };
    reserve();
    const observer = new ResizeObserver(reserve);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.scrollPaddingBottom = '';
      document.body.style.paddingBottom = '';
    };
  }, [isOpen, card]);
}
