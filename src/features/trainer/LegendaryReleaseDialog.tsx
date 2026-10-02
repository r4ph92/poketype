'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { PixelButton } from '@/components/pixel/PixelButton';

type LegendaryReleaseDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  keepLabel: string;
  pendingLabel: string;
  failureMessage: string;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
};

type DialogState = 'idle' | 'pending' | 'failed';

// Mounted only when the second confirmation is due; it opens at once with the safe choice focused.
export function LegendaryReleaseDialog({ title, message, confirmLabel, keepLabel, pendingLabel, failureMessage, onConfirm, onClose }: LegendaryReleaseDialogProps): ReactNode {
  const dialog = useRef<HTMLDialogElement>(null);
  const keepButton = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [state, setState] = useState<DialogState>('idle');

  useEffect(() => {
    dialog.current?.showModal();
    keepButton.current?.querySelector('button')?.focus();
  }, []);

  async function confirm(): Promise<void> {
    setState('pending');
    const done = await onConfirm();
    setState(done ? 'idle' : 'failed');
    if (done) onClose();
  }

  return (
    <dialog ref={dialog} aria-labelledby={titleId} onClose={onClose} className="confirm-dialog confirm-dialog-warning pixel-frame">
      <h2 id={titleId} className="font-pixel text-xl font-bold">{title}</h2>
      <p className="font-bold">{message}</p>
      {state === 'failed' && <p role="alert" className="font-bold">{failureMessage}</p>}
      <div className="flex flex-wrap gap-3">
        <div ref={keepButton}><PixelButton variant="secondary" onClick={() => dialog.current?.close()}>{keepLabel}</PixelButton></div>
        <PixelButton pending={state === 'pending'} onClick={() => void confirm()}>{state === 'pending' ? pendingLabel : confirmLabel}</PixelButton>
      </div>
    </dialog>
  );
}
