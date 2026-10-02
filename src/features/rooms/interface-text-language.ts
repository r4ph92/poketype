import 'server-only';
import { getLocale } from 'next-intl/server';
import { defaultTextLanguage, isTextLanguage, type TextLanguage } from '@/domain/text-settings';

// A new room races in the language its host reads the interface in; the host can switch it in the lobby.
export async function interfaceTextLanguage(): Promise<TextLanguage> {
  const locale = await getLocale();
  return isTextLanguage(locale) ? locale : defaultTextLanguage;
}
