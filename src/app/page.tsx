import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { gameConfig } from '@/config/game';
import { GuestNameForm } from '@/features/guest/GuestNameForm';
import { findCurrentGuest } from '@/server/sessions/current-guest';

export default async function HomePage() {
  if (await findCurrentGuest()) redirect('/play');
  const t = await getTranslations('Home');
  const entry = await getTranslations('GuestEntry');
  const limits = gameConfig.trainerName;
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="mt-4 text-lg">{t('welcome')}</p>
      <h2 className="mt-8 text-2xl font-bold">{entry('heading')}</h2>
      <GuestNameForm
        label={entry('label')}
        hint={entry('hint', { min: limits.minLength, max: limits.maxLength })}
        submitLabel={entry('submit')}
        errors={{
          required: entry('errors.required'),
          length: entry('errors.length', { min: limits.minLength, max: limits.maxLength }),
          characters: entry('errors.characters'),
        }}
      />
    </main>
  );
}
