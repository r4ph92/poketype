import { CodeChallengeMethod, OAuth2Client } from 'arctic';
import { z } from 'zod';
import { gameConfig } from '@/config/game';
import type { OAuthProvider } from '@/domain/oauth-provider';
import type { OAuthCredentials } from './oauth-settings';

export type ProviderIdentity = { providerUserId: string; login: string };

// The only two steps that talk to the provider; unit tests stand in for them, the routes always use the real client.
export type OAuthProviderClient = {
  authorizationUrl(state: string, codeVerifier: string): URL;
  fetchIdentity(code: string, codeVerifier: string): Promise<ProviderIdentity>;
};

type ProviderEndpoints = { authorization: string; token: string; profile: string; scopes: string[]; readProfile: (body: unknown) => ProviderIdentity | null };

export class OAuthProviderError extends Error {
  constructor(step: string) {
    super(`The provider answered the ${step} step unexpectedly`);
    this.name = 'OAuthProviderError';
  }
}

const githubProfileSchema = z.object({ id: z.number().int().positive(), login: z.string().min(1).max(100) });

const discordProfileSchema = z.object({ id: z.string().regex(/^\d{1,20}$/), username: z.string().min(1).max(100) });

export function readGitHubProfile(body: unknown): ProviderIdentity | null {
  const profile = githubProfileSchema.safeParse(body);
  return profile.success ? { providerUserId: String(profile.data.id), login: profile.data.login } : null;
}

export function readDiscordProfile(body: unknown): ProviderIdentity | null {
  const profile = discordProfileSchema.safeParse(body);
  return profile.success ? { providerUserId: profile.data.id, login: profile.data.username } : null;
}

const providerEndpoints: Record<OAuthProvider, ProviderEndpoints> = {
  github: {
    authorization: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    profile: 'https://api.github.com/user',
    scopes: ['read:user'],
    readProfile: readGitHubProfile,
  },
  discord: {
    authorization: 'https://discord.com/oauth2/authorize',
    token: 'https://discord.com/api/oauth2/token',
    profile: 'https://discord.com/api/users/@me',
    scopes: ['identify'],
    readProfile: readDiscordProfile,
  },
};

export function createProviderClient(provider: OAuthProvider, credentials: OAuthCredentials, redirectUri: string): OAuthProviderClient {
  const client = new OAuth2Client(credentials.clientId, credentials.clientSecret, redirectUri);
  const endpoints = providerEndpoints[provider];
  return {
    authorizationUrl: (state, codeVerifier) => client.createAuthorizationURLWithPKCE(endpoints.authorization, state, CodeChallengeMethod.S256, codeVerifier, endpoints.scopes),
    fetchIdentity: (code, codeVerifier) => withTimeout(exchangeForIdentity(client, endpoints, code, codeVerifier)),
  };
}

// The access token lives only for this one profile request; nothing about it is stored.
async function exchangeForIdentity(client: OAuth2Client, endpoints: ProviderEndpoints, code: string, codeVerifier: string): Promise<ProviderIdentity> {
  const tokens = await client.validateAuthorizationCode(endpoints.token, code, codeVerifier);
  const response = await fetch(endpoints.profile, { headers: { Authorization: `Bearer ${tokens.accessToken()}`, Accept: 'application/json', 'User-Agent': 'PokeType' } });
  if (!response.ok) throw new OAuthProviderError('profile');
  const identity = endpoints.readProfile(await response.json());
  if (!identity) throw new OAuthProviderError('profile');
  return identity;
}

async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new OAuthProviderError('timeout')), gameConfig.account.oauth.providerTimeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
