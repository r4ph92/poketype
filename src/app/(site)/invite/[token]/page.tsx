import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { InvitationRefused } from '@/features/rooms/invitations/InvitationRefused';
import { RaceAlreadyStarted } from '@/features/rooms/RaceAlreadyStarted';
import { RoomBanned } from '@/features/rooms/RoomBanned';
import { RoomFull } from '@/features/rooms/RoomFull';
import { redeemInvite } from './redeem-invite';

type InvitePageProps = { params: Promise<{ token: string }> };

// A successful redemption redirects to the room, so this page only ever shows why a link did not let the visitor in.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('invitationTitle') };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const refusal = await redeemInvite((await params).token);
  if (refusal === 'race-started') return <RaceAlreadyStarted />;
  if (refusal === 'full') return <RoomFull />;
  if (refusal === 'banned') return <RoomBanned />;
  return <InvitationRefused problem={refusal} />;
}
