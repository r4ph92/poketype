import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { oauthUsernameCandidates } from '../../src/domain/oauth-username';
import { usernamePattern } from '../../src/domain/username';

describe('usernames made from a provider name', () => {
  it('keeps a provider name that already fits the username rule', () => {
    expect(oauthUsernameCandidates('Maya-Dev', 'github')[0]).toBe('Maya-Dev');
  });

  it('adds a numeric suffix to the name for the following candidates', () => {
    expect(oauthUsernameCandidates('maya', 'discord').slice(0, 3)).toEqual(['maya', 'maya2', 'maya3']);
  });

  it('replaces characters outside the rule and strips accents', () => {
    expect(oauthUsernameCandidates('élodie.ç', 'discord')[0]).toBe('elodie_c');
    expect(oauthUsernameCandidates('a..b', 'discord')[0]).toBe('a_b');
  });

  it('truncates a long name to the maximum length, even with a suffix', () => {
    const candidates = oauthUsernameCandidates('a-very-long-github-login-name', 'github');
    expect(candidates[0]).toBe('a-very-long-github-l');
    expect(candidates[1]).toBe('a-very-long-github-2');
    expect(candidates.at(-1)).toBe(`a-very-long-githu${gameConfig.account.oauth.maxUsernameSuffix}`);
  });

  it('pads a name that is too short and falls back to the provider name when nothing is left', () => {
    expect(oauthUsernameCandidates('ab', 'discord')[0]).toBe('ab_discord');
    expect(oauthUsernameCandidates('...', 'github')[0]).toBe('github');
  });

  it('only ever offers names the account rule and the database check accept', () => {
    const logins = ['Maya', 'x', '__', 'ÉÀÔ', 'a'.repeat(40), 'li.na_99', '🙂🙂🙂', 'zoé-42'];
    for (const login of logins) {
      for (const candidate of oauthUsernameCandidates(login, 'discord')) expect(candidate).toMatch(usernamePattern);
    }
  });

  it('never offers the same name twice', () => {
    const candidates = oauthUsernameCandidates('maya', 'github');
    expect(new Set(candidates.map((candidate) => candidate.toLowerCase())).size).toBe(candidates.length);
  });
});
