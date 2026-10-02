import type { TextLanguage } from '@/domain/text-settings';
import { englishWords } from './en';
import { frenchWords } from './fr';

// The words a race text is drawn from, one list per text language, most frequent first.
export const raceWordLists: Readonly<Record<TextLanguage, readonly string[]>> = { fr: frenchWords, en: englishWords };
