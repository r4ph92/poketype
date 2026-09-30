import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { leaveAsGuest } from '@/features/guest/leave-as-guest';
import { findCurrentGuest } from '@/server/sessions/current-guest';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('playTitle') };
}

export default async function PlayPage() {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const t = await getTranslations('Play');
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold wrap-anywhere sm:text-4xl">{t('greeting', { name: guest.trainerName })}</h1>
      <p className="mt-4 inline-block border-4 border-ink bg-gold px-3 py-1 font-bold">{t('guestLabel')}</p>
      <form action={leaveAsGuest} className="mt-8">
        <button type="submit" className="min-h-11 border-4 border-ink bg-cream px-6 font-bold">
          {t('leave')}
        </button>
      </form>
    </main>
  );
}
