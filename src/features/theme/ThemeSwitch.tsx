import { getTranslations } from 'next-intl/server';
import { ThemeChoices } from './ThemeChoices';

export async function ThemeSwitch() {
  const t = await getTranslations('ThemeSwitch');
  return <ThemeChoices label={t('label')} names={{ light: t('names.light'), dark: t('names.dark'), system: t('names.system') }} />;
}
