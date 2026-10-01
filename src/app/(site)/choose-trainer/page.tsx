import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { PageMain } from '@/components/pixel/PageMain';
import { defaultTrainerAvatar } from '@/assets/trainers';
import { ChooseTrainerView } from '@/features/trainer-selection/ChooseTrainerView';
import { findCurrentSession } from '@/server/sessions/current-session';
import { readTrainerAvatar } from '@/server/accounts/trainer-avatar';

export async function generateMetadata() {
  const t = await getTranslations('ChooseTrainer');
  return { title: t('title') };
}
export default async function ChooseTrainerPage() {
  const session = await findCurrentSession();
  if (!session?.account) redirect('/signup');
  const avatar = await readTrainerAvatar(session.account.id);
  const { ChooseTrainer } = await getMessages();
  return <PageMain wide><NextIntlClientProvider messages={{ ChooseTrainer }}><ChooseTrainerView initialAvatar={avatar ?? defaultTrainerAvatar} /></NextIntlClientProvider></PageMain>;
}
