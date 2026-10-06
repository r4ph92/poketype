export const consentCookieName = 'poketype_consent';

export const consentCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

export const consentLevels = ['necessary', 'preferences'] as const;

export type ConsentLevel = (typeof consentLevels)[number];

export function parseConsentLevel(value: unknown): ConsentLevel | null {
  return typeof value === 'string' && (consentLevels as readonly string[]).includes(value) ? (value as ConsentLevel) : null;
}

export function allowsPreferenceStorage(level: ConsentLevel | null): boolean {
  return level === 'preferences';
}

// Anything but an explicit yes stores only what the game needs.
export function consentLevelFromForm(formData: FormData): ConsentLevel {
  const choice = formData.get('choice');
  if (choice === 'accept') return 'preferences';
  if (choice === 'save' && formData.get('preferences') === 'on') return 'preferences';
  return 'necessary';
}
