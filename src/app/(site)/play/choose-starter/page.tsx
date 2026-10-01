import { randomInt } from 'node:crypto';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ChooseStarterView, type StarterDex } from '@/features/trainer/ChooseStarterView';
import { findCurrentSession } from '@/server/sessions/current-session';
import { readTrainerAvatar } from '@/server/accounts/trainer-avatar';

export async function generateMetadata() {
  const t = await getTranslations('ChooseStarter');
  return { title: t('title') };
}

export default async function ChooseStarterPage() {
  const session = await findCurrentSession();
  if (!session?.account) redirect('/signup');
  if (!(await readTrainerAvatar(session.account.id))) redirect('/choose-trainer');
  // Always offer all three original starters, in a shuffled presentation order.
  const options: StarterDex[] = [1, 4, 7];
  for (let i = options.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  const { ChooseStarter } = await getMessages();
  return <NextIntlClientProvider messages={{ ChooseStarter }}><ChooseStarterView options={options} /></NextIntlClientProvider>;
}
