import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createProviderClient, readDiscordProfile, readGitHubProfile } from '../../src/server/oauth/provider-client';
import { createSecretToken } from '../../src/server/secret-token';

const credentials = { clientId: 'placeholder-client-id', clientSecret: 'placeholder-secret' };

function s256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

describe('the address that sends the player to the provider', () => {
  it.each([
    ['github', 'https://github.com/login/oauth/authorize', 'read:user'],
    ['discord', 'https://discord.com/oauth2/authorize', 'identify'],
  ] as const)('sends %s the client, callback, scope, state and an S256 PKCE challenge', (provider, endpoint, scope) => {
    const state = createSecretToken();
    const verifier = createSecretToken();
    const callback = `http://localhost:3000/auth/${provider}/callback`;
    const url = createProviderClient(provider, credentials, callback).authorizationUrl(state, verifier);
    expect(`${url.origin}${url.pathname}`).toBe(endpoint);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: credentials.clientId,
      redirect_uri: callback,
      state,
      scope,
      code_challenge_method: 'S256',
      code_challenge: s256(verifier),
    });
  });

  it('never puts the client secret or the verifier in the address', () => {
    const verifier = createSecretToken();
    const url = createProviderClient('github', credentials, 'http://localhost:3000/auth/github/callback').authorizationUrl(createSecretToken(), verifier).toString();
    expect(url).not.toContain(credentials.clientSecret);
    expect(url).not.toContain(verifier);
  });
});

describe('reading the provider profile', () => {
  it('takes the numeric GitHub id and login', () => {
    expect(readGitHubProfile({ id: 583231, login: 'octocat', avatar_url: 'ignored' })).toEqual({ providerUserId: '583231', login: 'octocat' });
  });

  it('takes the Discord snowflake id and username', () => {
    expect(readDiscordProfile({ id: '80351110224678912', username: 'nelly', global_name: 'Nelly' })).toEqual({ providerUserId: '80351110224678912', login: 'nelly' });
  });

  it('refuses a profile without a usable id or name', () => {
    expect(readGitHubProfile({ id: '583231', login: 'octocat' })).toBeNull();
    expect(readGitHubProfile({ id: 583231 })).toBeNull();
    expect(readDiscordProfile({ id: 'abc', username: 'nelly' })).toBeNull();
    expect(readDiscordProfile({ id: '1', username: '' })).toBeNull();
    expect(readDiscordProfile(null)).toBeNull();
  });
});
