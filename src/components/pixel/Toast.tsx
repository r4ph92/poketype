'use client';

import type { ReactNode } from 'react';
import { PixelButton } from './PixelButton';

type ToastProps = { isOpen: boolean; message: string; dismissLabel: string; onDismiss: () => void; action?: ReactNode };

// The live region stays mounted while the toast is closed, so screen readers announce the message when it appears.
export function Toast({ isOpen, message, dismissLabel, onDismiss, action }: ToastProps) {
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md">
      {isOpen && (
        <div className="toast-card pixel-notch grid gap-3 border-4 border-frame bg-cream p-4 text-ink">
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
