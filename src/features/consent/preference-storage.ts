import { currentTheme, forgetTheme, rememberTheme } from '@/features/theme/theme-document';

// The theme is the only optional value the app keeps in browser storage; add any new one here.
export function applyPreferenceConsent(isAllowed: boolean): void {
  if (isAllowed) rememberTheme(currentTheme());
  else forgetTheme();
}
