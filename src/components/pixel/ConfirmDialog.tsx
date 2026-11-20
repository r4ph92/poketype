'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { PixelButton } from './PixelButton';

type ConfirmDialogProps = {
  triggerLabel: string;
  // Names what the trigger acts on when several triggers share one visible word; it starts with the visible word.
  triggerAccessibleLabel?: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  failureMessage: string;
  onConfirm: () => Promise<boolean>;
  // Called after a confirmed action closes the dialog, when the trigger may be about to disappear and focus must go elsewhere.
  onDone?: () => void;
};

type ConfirmState = 'idle' | 'pending' | 'failed';

// It opens on the cancel button, so Enter never confirms by accident. The dialog stays open with an error when the action fails, so the player is never told it worked.
export function ConfirmDialog({ triggerLabel, triggerAccessibleLabel, title, message, confirmLabel, cancelLabel, pendingLabel, failureMessage, onConfirm, onDone }: ConfirmDialogProps): ReactNode {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();
  const [state, setState] = useState<ConfirmState>('idle');

  async function confirm(): Promise<void> {
    setState('pending');
    const done = await onConfirm();
    setState(done ? 'idle' : 'failed');
    if (!done) return;
    dialog.current?.close();
    onDone?.();
  }

  function open(): void {
    setState('idle');
    dialog.current?.showModal();
    cancelButton.current?.querySelector('button')?.focus();
  }

  return (
    <>
      <PixelButton variant="secondary" onClick={open}>{triggerAccessibleLabel ? <><span aria-hidden="true">{triggerLabel}</span><span className="sr-only">{triggerAccessibleLabel}</span></> : triggerLabel}</PixelButton>
      <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={messageId} className="confirm-dialog pixel-frame text-ink">
        <h2 id={titleId} className="font-pixel text-xl font-bold">{title}</h2>
        <p id={messageId}>{message}</p>
        {state === 'failed' && <p role="alert" className="font-bold text-error">{failureMessage}</p>}
        <div className="flex flex-wrap gap-3">
          <PixelButton pending={state === 'pending'} onClick={() => void confirm()}>{state === 'pending' ? pendingLabel : confirmLabel}</PixelButton>
          <div ref={cancelButton}><PixelButton variant="secondary" onClick={() => dialog.current?.close()}>{cancelLabel}</PixelButton></div>
        </div>
      </dialog>
    </>
  );
}
