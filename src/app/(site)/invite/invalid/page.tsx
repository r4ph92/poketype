import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { InvitationRefused } from '@/features/rooms/invitations/InvitationRefused';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('invitationTitle') };
}

// Where the proxy sends an invitation address Next cannot decode.
export default function UndecodableInvitationPage() {
  return <InvitationRefused problem="invalid" />;
}
