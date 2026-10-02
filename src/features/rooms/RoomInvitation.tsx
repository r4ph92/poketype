'use client';

import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelButton } from '@/components/pixel/PixelButton';
import type { RoomCode } from '@/domain/room-code';
import { RoomAddressField } from './RoomAddressField';
import { useClipboardCopy, type CopyOutcome } from './use-clipboard-copy';

type CopySubject = 'code' | 'link';

type CopyMessageKey = 'Lobby.codeCopied' | 'Lobby.codeCopyFailed' | 'Room.copied' | 'Room.copyFailed';

const copyMessageKeys: Record<CopySubject, Record<Exclude<CopyOutcome, 'idle'>, CopyMessageKey>> = {
  code: { copied: 'Lobby.codeCopied', failed: 'Lobby.codeCopyFailed' },
  link: { copied: 'Room.copied', failed: 'Room.copyFailed' },
};

function roomUrl(): string {
  return window.location.origin + window.location.pathname;
}

export function RoomInvitation({ code }: { code: RoomCode }) {
  const t = useTranslations();
  const { outcome, subject, text, copyCount, copy } = useClipboardCopy<CopySubject>();
  return (
    <div className="grid gap-3">
      <p className="font-pixel font-bold">{t('Lobby.code')}</p>
      <p className="lobby-invite-code">{code}</p>
      <p>{t('Room.inviteHint')}</p>
      <PixelButton variant="secondary" onClick={() => void copy('code', code)}>{t('Lobby.copyCode')}</PixelButton>
      <PixelButton variant="secondary" onClick={() => void copy('link', roomUrl())}>{t('Room.copyLink')}</PixelButton>
      <CopyStatus subject={subject} outcome={outcome} />
      {subject === 'link' && outcome === 'failed' && <RoomAddressField key={copyCount} roomUrl={text} label={t('Room.linkLabel')} />}
    </div>
  );
}

function CopyStatus({ subject, outcome }: { subject: CopySubject | null; outcome: CopyOutcome }) {
  const t = useTranslations();
  return (
    <div role="status">
      {subject && outcome !== 'idle' && (
        <DialogueBox tone={outcome === 'copied' ? 'success' : 'info'}>
          <p>{t(copyMessageKeys[subject][outcome])}</p>
        </DialogueBox>
      )}
    </div>
  );
}
