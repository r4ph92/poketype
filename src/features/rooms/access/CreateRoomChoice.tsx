'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { PixelButton, type ButtonVariant } from '@/components/pixel/PixelButton';
import { SubmitButton } from '@/components/pixel/SubmitButton';
import { useIsHydrated } from '@/components/use-is-hydrated';
import { defaultRoomVisibility, type RoomVisibility } from '@/domain/room-visibility';
import { createRoom } from '../create-room';
import { VisibilityChoice } from './VisibilityChoice';

type CreateRoomChoiceProps = { label: string; variant?: ButtonVariant };

// Without JavaScript the button submits on its own and opens the default public room; with it, the button asks first.
// The dialog lives in document.body so the action row's button styles never reach it.
export function CreateRoomChoice({ label, variant = 'primary' }: CreateRoomChoiceProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const isHydrated = useIsHydrated();

  function askForVisibility(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    dialog.current?.showModal();
  }

  return (
    <>
      <form action={createRoom} onSubmit={askForVisibility}>
        <SubmitButton label={label} variant={variant} />
      </form>
      {isHydrated && createPortal(<CreateRoomDialog dialog={dialog} />, document.body)}
    </>
  );
}

function CreateRoomDialog({ dialog }: { dialog: RefObject<HTMLDialogElement | null> }) {
  const t = useTranslations('RoomAccess');
  const titleId = useId();
  const [visibility, setVisibility] = useState<RoomVisibility>(defaultRoomVisibility);
  return (
    <dialog ref={dialog} aria-labelledby={titleId} className="confirm-dialog pixel-frame text-ink">
      <form action={createRoom} className="grid gap-4">
        <h2 id={titleId} className="font-pixel text-xl font-bold">{t('createTitle')}</h2>
        <VisibilityChoice name="visibility" selected={visibility} onChoose={setVisibility} />
        <div className="flex flex-wrap gap-3">
          <SubmitButton label={t('confirmCreate')} />
          <PixelButton variant="secondary" onClick={() => dialog.current?.close()}>{t('cancel')}</PixelButton>
        </div>
      </form>
    </dialog>
  );
}
