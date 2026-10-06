import { getTranslations } from 'next-intl/server';
import { readConsentLevel } from '@/features/consent/consent-cookie';
import { allowsPreferenceStorage } from '@/features/consent/consent-level';
import { ThemeChoices } from './ThemeChoices';

export async function ThemeSwitch() {
  const t = await getTranslations('ThemeSwitch');
  const canRemember = allowsPreferenceStorage(await readConsentLevel());
  return <ThemeChoices label={t('label')} names={{ light: t('names.light'), dark: t('names.dark'), system: t('names.system') }} canRemember={canRemember} />;
}
