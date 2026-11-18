import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import enFallback from '../../messages/fallback/en.json';
import frFallback from '../../messages/fallback/fr.json';
import fr from '../../messages/fr.json';
import { gameConfig } from '../../src/config/game';
import { roomVisibilities } from '../../src/domain/room-visibility';
import { visibilityHintKey } from '../../src/features/rooms/access/VisibilityChoice';
import { invitationLinksMessageKeys } from '../../src/features/rooms/invitations/invitation-links-messages';

type Catalog = { [key: string]: string | Catalog };

function keyPaths(catalog: Catalog): string[] {
  return entries(catalog).map(([path]) => path);
}

function entries(catalog: Catalog, prefix = ''): [string, string][] {
  return Object.entries(catalog).flatMap(([key, value]) =>
    typeof value === 'string' ? [[`${prefix}${key}`, value] as [string, string]] : entries(value, `${prefix}${key}.`),
  );
}

describe('message catalogs', () => {
  it('French holds every namespace the pages use', () => {
    expect(Object.keys(fr)).toEqual(
      expect.arrayContaining(['Footer', 'GuestEntry', 'Home', 'Metadata', 'NotFound', 'Play', 'Room', 'SignUp', 'AccountBar', 'RaceHistory', 'Profile']),
    );
  });

  it('English and French hold the same namespaces', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('every namespace has exactly the same keys in both languages', () => {
    for (const namespace of Object.keys(fr) as (keyof typeof fr)[]) {
      expect(keyPaths(en[namespace]).sort(), namespace).toEqual(keyPaths(fr[namespace]).sort());
    }
  });

  it('every key uses the same placeholders in both languages', () => {
    const placeholders = (catalog: Catalog) => Object.fromEntries(entries(catalog).map(([path, text]) => [path, [...text.matchAll(/\{(\w+)/g)].map((match) => match[1]).sort()]));
    expect(placeholders(en)).toEqual(placeholders(fr));
  });

  it('no message is a bare placeholder, so the visible-string check can never match any text with it', () => {
    const barePlaceholders = [...entries(fr), ...entries(en)].filter(([, text]) => /^\{\s*\w+\s*\}$/.test(text));
    expect(barePlaceholders).toEqual([]);
  });
});

describe('fallback catalogs for the global error page', () => {
  it.each([
    ['fr', fr, frFallback],
    ['en', en, enFallback],
  ])('%s slice matches the main catalog', (_locale, main, fallback) => {
    expect(fallback).toEqual({ ServerError: main.ServerError, Footer: main.Footer });
  });
});

describe('room access and invitation texts', () => {
  it.each(roomVisibilities)('names and explains the %s visibility in both languages', (visibility) => {
    for (const catalog of [fr, en]) {
      expect(catalog.RoomAccess[visibility]).toBeTruthy();
      expect(catalog.RoomAccess[visibilityHintKey[visibility]]).toBeTruthy();
    }
  });

  it('offers Publique, Sur code and Privée in French, and their English names', () => {
    expect(roomVisibilities.map((visibility) => fr.RoomAccess[visibility])).toEqual(['Publique', 'Sur code', 'Privée']);
    expect(roomVisibilities.map((visibility) => en.RoomAccess[visibility])).toEqual(['Public', 'By code', 'Private']);
  });

  it('holds every text of the host invitation list in both languages', () => {
    for (const key of invitationLinksMessageKeys) {
      expect(fr.Invitations[key], key).toBeTruthy();
      expect(en.Invitations[key], key).toBeTruthy();
    }
  });

  it('words the invitation outcomes as the story asks', () => {
    expect(fr.Invitations.create).toBe('Créer une invitation');
    expect(fr.Invitations.unused).toBe('Non utilisée');
    expect(fr.Invitations.usedBy).toBe('Utilisée par {name}');
    expect(fr.Invitations.copy).toBe('Copier');
    expect(fr.Invitations.invalidHeading).toBe('Invitation invalide');
    expect(fr.Invitations.usedHeading).toBe('Invitation déjà utilisée');
    expect(fr.RoomAccess.errors.private).toBe('Cette salle est privée : il te faut une invitation');
    expect(fr.Invitations.privateMessage).toContain(fr.RoomAccess.errors.private);
    expect(en.Invitations.privateMessage).toContain(en.RoomAccess.errors.private);
  });
});

describe('profile texts', () => {
  const profileOf = (locale: 'fr' | 'en', messages: typeof fr) => createTranslator({ locale, messages, namespace: 'Profile' });

  it('names the page and the data toggle as the story asks', () => {
    expect(fr.Profile.title).toBe('Profil');
    expect(en.Profile.title).toBe('Profile');
    expect(fr.Profile.showData).toBe('Voir les données');
    expect(en.Profile.showData).toBe('Show the data');
  });

  it('asks for at least the configured number of races before showing the chart', () => {
    const count = gameConfig.profile.minimumChartRaces;
    expect(profileOf('fr', fr)('notEnough', { count })).toBe('Fais au moins 2 courses pour voir ta progression');
    expect(profileOf('en', en)('notEnough', { count })).toBe('Finish at least 2 races to see your progress');
  });

  it('counts the charted races with the plural of each language', () => {
    expect(profileOf('fr', fr)('chartScope', { count: 12 })).toBe('Tes 12 dernières courses, sans les abandons');
    expect(profileOf('en', en)('chartScope', { count: 12 })).toBe('Your latest 12 races, not counting abandons');
  });
});
