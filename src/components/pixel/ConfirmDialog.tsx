'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { PixelButton } from './PixelButton';

type ConfirmDialogProps = {
  triggerLabel: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  failureMessage: string;
  onConfirm: () => Promise<boolean>;
};

type ConfirmState = 'idle' | 'pending' | 'failed';

// The dialog stays open with an error when the action fails, so the player is never told it worked.
export function ConfirmDialog({ triggerLabel, title, message, confirmLabel, cancelLabel, pendingLabel, failureMessage, onConfirm }: ConfirmDialogProps): ReactNode {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, setState] = useState<ConfirmState>('idle');

  async function confirm(): Promise<void> {
    setState('pending');
    const done = await onConfirm();
    setState(done ? 'idle' : 'failed');
    if (done) dialog.current?.close();
  }

  function open(): void {
    setState('idle');
    dialog.current?.showModal();
  }

  return (
    <>
      <PixelButton variant="secondary" onClick={open}>{triggerLabel}</PixelButton>
      <dialog ref={dialog} aria-labelledby={titleId} className="confirm-dialog pixel-frame text-ink">
        <h2 id={titleId} className="font-pixel text-xl font-bold">{title}</h2>
        <p>{message}</p>
        {state === 'failed' && <p role="alert" className="font-bold text-error">{failureMessage}</p>}
        <div className="flex flex-wrap gap-3">
          <PixelButton pending={state === 'pending'} onClick={() => void confirm()}>{state === 'pending' ? pendingLabel : confirmLabel}</PixelButton>
          <PixelButton variant="secondary" onClick={() => dialog.current?.close()}>{cancelLabel}</PixelButton>
        </div>
      </dialog>
    </>
  );
}
