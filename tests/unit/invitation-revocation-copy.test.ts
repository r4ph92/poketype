import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { invitationLinksMessageKeys } from '../../src/features/rooms/invitations/invitation-links-messages';

describe('revoked and closed invitation copy (#142)', () => {
  it('names a kicked player\'s link and a closed room with the wording the criteria require, in French', () => {
    expect(fr.Invitations.revokedHeading).toBe('Invitation révoquée');
    expect(fr.Invitations.revoked).toBe('Révoquée');
    expect(fr.Invitations.closedHeading).toBe('Cette salle est fermée');
  });

  it('shows the same messages in English when the interface is in English', () => {
    expect(en.Invitations.revokedHeading).toBe('Invitation revoked');
    expect(en.Invitations.revoked).toBe('Revoked');
    expect(en.Invitations.closedHeading).toBe('This room is closed');
    expect(en.Invitations.revokedMessage).not.toBe(fr.Invitations.revokedMessage);
    expect(en.Invitations.closedMessage).not.toBe(fr.Invitations.closedMessage);
  });

  it('keeps a closed room apart from an invalid link', () => {
    for (const catalog of [fr, en]) {
      expect(catalog.Invitations.closedHeading).not.toBe(catalog.Invitations.invalidHeading);
      expect(catalog.Invitations.invalidMessage).not.toMatch(/ferm|closed/i);
    }
  });

  it('sends the host list its revoked label', () => {
    expect(invitationLinksMessageKeys).toContain('revoked');
  });
});
