import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { PokedexView } from '@/features/trainer/PokedexView';
export async function generateMetadata() { const t = await getTranslations('Pokedex'); return { title: t('title') }; }
export default async function PokedexPage() {
  const { Pokedex, Pokemon, Animation, Trainer } = await getMessages();
  return <NextIntlClientProvider messages={{ Pokedex, Pokemon, Animation, Trainer }}><PokedexView /></NextIntlClientProvider>;
}
