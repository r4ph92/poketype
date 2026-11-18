import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import enFallback from '../../messages/fallback/en.json';
import frFallback from '../../messages/fallback/fr.json';
import fr from '../../messages/fr.json';
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
      expect.arrayContaining(['Footer', 'GuestEntry', 'Home', 'Metadata', 'NotFound', 'Play', 'Room', 'SignUp', 'AccountBar']),
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
