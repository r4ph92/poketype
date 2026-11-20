import { describe, expect, it } from 'vitest';
import { oauthCallbackUrl, readOAuthAvailability, readOAuthCredentials } from '../../src/server/oauth/oauth-settings';

const githubOnly = { GITHUB_CLIENT_ID: 'github-id', GITHUB_CLIENT_SECRET: 'github-secret' };

describe('provider credentials from the environment', () => {
  it('offers no provider when no credential is set', () => {
    expect(readOAuthAvailability({})).toEqual({ github: false, discord: false });
  });

  it('offers a provider only with both its ID and its secret', () => {
    expect(readOAuthAvailability(githubOnly)).toEqual({ github: true, discord: false });
    expect(readOAuthAvailability({ DISCORD_CLIENT_ID: 'discord-id' })).toEqual({ github: false, discord: false });
    expect(readOAuthAvailability({ DISCORD_CLIENT_SECRET: 'discord-secret', DISCORD_CLIENT_ID: '  ' })).toEqual({ github: false, discord: false });
  });

  it('reads the credentials of the provider asked for', () => {
    expect(readOAuthCredentials(githubOnly, 'github')).toEqual({ clientId: 'github-id', clientSecret: 'github-secret' });
    expect(readOAuthCredentials(githubOnly, 'discord')).toBeNull();
  });
});

describe('the callback address', () => {
  it('uses the request origin when no public base is configured', () => {
    expect(oauthCallbackUrl({}, 'http://localhost:3000', 'github')).toBe('http://localhost:3000/auth/github/callback');
  });

  it('prefers the configured public base, ignoring any path', () => {
    expect(oauthCallbackUrl({ PUBLIC_BASE_URL: 'https://poketype.example/some/path' }, 'http://evil.example', 'discord')).toBe('https://poketype.example/auth/discord/callback');
  });

  it('fails loudly on a public base that is not an http address', () => {
    expect(() => oauthCallbackUrl({ PUBLIC_BASE_URL: 'javascript:alert(1)' }, 'http://localhost:3000', 'github')).toThrow(/PUBLIC_BASE_URL/);
    expect(() => oauthCallbackUrl({ PUBLIC_BASE_URL: 'poketype.example' }, 'http://localhost:3000', 'github')).toThrow(/PUBLIC_BASE_URL/);
  });
});
