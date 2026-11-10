import { defaultLocale, isLocale, type Locale } from './config';

type WeightedLanguage = { language: string; weight: number; position: number };

// A browser sends a few entries; anything longer is not worth parsing and falls back to the default.
const maxHeaderLength = 512;
const maxEntries = 16;
const languageTag = /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$/;
const weightParameter = /^q=(0(\.\d{0,3})?|1(\.0{0,3})?)$/;

export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header || header.length > maxHeaderLength) return defaultLocale;
  const preferred = parseEntries(header)
    .filter((entry) => entry.weight > 0)
    .sort((first, second) => second.weight - first.weight || first.position - second.position)
    .map((entry) => primarySubtag(entry.language))
    .find(isLocale);
  return preferred ?? defaultLocale;
}

function parseEntries(header: string): WeightedLanguage[] {
  return header
    .split(',')
    .slice(0, maxEntries)
    .map((entry, position) => parseEntry(entry.trim(), position))
    .filter((entry): entry is WeightedLanguage => entry !== null);
}

function parseEntry(entry: string, position: number): WeightedLanguage | null {
  const [language, parameter] = entry.split(';').map((part) => part.trim());
  if (!language || !languageTag.test(language)) return null;
  if (parameter === undefined) return { language, weight: 1, position };
  if (!weightParameter.test(parameter)) return null;
  return { language, weight: Number(parameter.slice(2)), position };
}

function primarySubtag(language: string): string {
  const [primary = ''] = language.split('-');
  return primary.toLowerCase();
}
