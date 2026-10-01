export const themeChoices = ['light', 'dark', 'system'] as const;
export type ThemeChoice = (typeof themeChoices)[number];

export const themeStorageKey = 'poketype-theme';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && (themeChoices as readonly string[]).includes(value);
}
