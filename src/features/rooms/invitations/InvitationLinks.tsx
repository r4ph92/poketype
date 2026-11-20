'use client';

import { useTranslations } from 'next-intl';
import { PixelButton } from '@/components/pixel/PixelButton';
import { gameConfig } from '@/config/game';
import type { InvitationView } from '@/domain/invitation';
import { invitationPath, type InvitationToken } from '@/domain/invitation-token';
import type { RoomId } from '@/domain/room-id';
import { RoomAddressField } from '../RoomAddressField';
import { useClipboardCopy, type CopyOutcome } from '../use-clipboard-copy';
import type { StoredLinks } from './invitation-link-store';
import { useInvitationLinks, type CreationState } from './use-invitation-links';

type InvitationLinksProps = { roomId: RoomId; viewerMemberKey: string; invitations: InvitationView[] };

type CopyLink = (invitationId: string, url: string) => void;

type CopyFeedbackProps = { number: number | null; outcome: CopyOutcome; url: string; copyCount: number };

// Host only: one link per invitee, numbered in creation order, each with its status and, in the tab that created it, a copy button.
export function InvitationLinks({ roomId, viewerMemberKey, invitations }: InvitationLinksProps) {
  const t = useTranslations('Invitations');
  const { links, creation, create } = useInvitationLinks(roomId, viewerMemberKey);
  const copying = useClipboardCopy<string>();
  const numberOf = (invitationId: string) => invitations.findIndex((invitation) => invitation.id === invitationId) + 1;
  return (
    <section aria-labelledby="invitation-links-title" className="grid gap-3">
      <h3 id="invitation-links-title" className="font-pixel font-bold">{t('heading')}</h3>
      <p className="text-sm">{t('hint')}</p>
      <PixelButton variant="secondary" pending={creation === 'pending'} onClick={create}>{t('create')}</PixelButton>
      <CreationStatus creation={creation} />
      <InvitationList invitations={invitations} links={links} onCopy={(id, url) => void copying.copy(id, url)} />
      <CopyFeedback number={copying.subject ? numberOf(copying.subject) : null} outcome={copying.outcome} url={copying.text} copyCount={copying.copyCount} />
    </section>
  );
}

// A failed copy shows the link selected in a field, so the host can copy it by hand.
function CopyFeedback({ number, outcome, url, copyCount }: CopyFeedbackProps) {
  const t = useTranslations('Invitations');
  const isFailed = number !== null && outcome === 'failed';
  return (
    <>
      <p role="status" className="text-sm font-bold">
        {number !== null && outcome === 'copied' && t('copied', { number })}
        {isFailed && t('copyFailed', { number })}
      </p>
      {isFailed && <RoomAddressField key={copyCount} roomUrl={url} label={t('linkLabel', { number })} />}
    </>
  );
}

function CreationStatus({ creation }: { creation: CreationState }) {
  const t = useTranslations('Invitations');
  if (creation === 'too-many') return <p role="alert" className="text-sm font-bold text-error">{t('tooMany', { max: gameConfig.rooms.maxInvitations })}</p>;
  if (creation === 'failed') return <p role="alert" className="text-sm font-bold text-error">{t('createFailed')}</p>;
  return <p role="status" className="text-sm font-bold">{creation === 'pending' && t('creating')}</p>;
}

function InvitationList({ invitations, links, onCopy }: { invitations: InvitationView[]; links: StoredLinks; onCopy: CopyLink }) {
  const t = useTranslations('Invitations');
  if (invitations.length === 0) return <p className="text-sm">{t('empty')}</p>;
  return (
    <ol aria-label={t('listLabel')} className="grid gap-2">
      {invitations.map((invitation, index) => (
        <InvitationRow key={invitation.id} invitation={invitation} number={index + 1} token={links[invitation.id] ?? null} onCopy={onCopy} />
      ))}
    </ol>
  );
}

type InvitationRowProps = { invitation: InvitationView; number: number; token: InvitationToken | null; onCopy: CopyLink };

function useLabel({ usedBy, revoked }: InvitationView, t: ReturnType<typeof useTranslations<'Invitations'>>): string {
  if (revoked) return t('revoked');
  return usedBy === null ? t('unused') : t('usedBy', { name: usedBy });
}

function InvitationRow({ invitation, number, token, onCopy }: InvitationRowProps) {
  const t = useTranslations('Invitations');
  return (
    <li className="pixel-frame-thin grid gap-2 bg-cream-deep p-2">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-pixel font-semibold">{t('linkName', { number })}</span>
        <span className={invitation.usedBy === null ? 'text-sm text-muted' : 'text-sm font-bold'}>{useLabel(invitation, t)}</span>
      </p>
      {token ? (
        <PixelButton variant="secondary" onClick={() => onCopy(invitation.id, window.location.origin + invitationPath(token))}>
          <span aria-hidden="true">{t('copy')}</span>
          <span className="sr-only">{t('copyLabel', { number })}</span>
        </PixelButton>
      ) : (
        <p className="text-sm text-muted">{t('linkElsewhere')}</p>
      )}
    </li>
  );
}
