import { describe, expect, it } from 'vitest';
import { allowsPreferenceStorage, consentLevelFromForm, parseConsentLevel } from '@/features/consent/consent-level';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe('cookie consent level', () => {
  it('reads only a known stored level', () => {
    expect(parseConsentLevel('preferences')).toBe('preferences');
    expect(parseConsentLevel('necessary')).toBe('necessary');
    expect(parseConsentLevel('all')).toBeNull();
    expect(parseConsentLevel(undefined)).toBeNull();
  });

  it('allows optional storage only after an explicit yes', () => {
    expect(allowsPreferenceStorage('preferences')).toBe(true);
    expect(allowsPreferenceStorage('necessary')).toBe(false);
    expect(allowsPreferenceStorage(null)).toBe(false);
  });

  it('turns accept into preferences and refuse into necessary only', () => {
    expect(consentLevelFromForm(form({ choice: 'accept' }))).toBe('preferences');
    expect(consentLevelFromForm(form({ choice: 'refuse', preferences: 'on' }))).toBe('necessary');
  });

  it('saves a customized choice from the preferences switch', () => {
    expect(consentLevelFromForm(form({ choice: 'save', preferences: 'on' }))).toBe('preferences');
    expect(consentLevelFromForm(form({ choice: 'save' }))).toBe('necessary');
  });

  it('stores only necessary cookies for an unknown or missing choice', () => {
    expect(consentLevelFromForm(form({ choice: 'everything', preferences: 'on' }))).toBe('necessary');
    expect(consentLevelFromForm(form({}))).toBe('necessary');
  });
});
