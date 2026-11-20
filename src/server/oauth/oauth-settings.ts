import { oauthProviders, type OAuthProvider } from '@/domain/oauth-provider';

export type OAuthCredentials = { clientId: string; clientSecret: string };

export type OAuthEnvironment = Readonly<Record<string, string | undefined>>;

const credentialVariables: Record<OAuthProvider, { id: string; secret: string }> = {
  github: { id: 'GITHUB_CLIENT_ID', secret: 'GITHUB_CLIENT_SECRET' },
  discord: { id: 'DISCORD_CLIENT_ID', secret: 'DISCORD_CLIENT_SECRET' },
};

const baseUrlVariable = 'PUBLIC_BASE_URL';

// A provider is offered only with both its ID and its secret; anything less keeps its button disabled.
export function readOAuthCredentials(environment: OAuthEnvironment, provider: OAuthProvider): OAuthCredentials | null {
  const clientId = environment[credentialVariables[provider].id]?.trim();
  const clientSecret = environment[credentialVariables[provider].secret]?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function readOAuthAvailability(environment: OAuthEnvironment): Record<OAuthProvider, boolean> {
  return Object.fromEntries(oauthProviders.map((provider) => [provider, readOAuthCredentials(environment, provider) !== null])) as Record<OAuthProvider, boolean>;
}

// The callback address must match the one registered with the provider, so a configured base wins over the request's own origin.
export function oauthCallbackUrl(environment: OAuthEnvironment, requestOrigin: string, provider: OAuthProvider): string {
  return new URL(`/auth/${provider}/callback`, readBaseUrl(environment) ?? requestOrigin).toString();
}

function readBaseUrl(environment: OAuthEnvironment): string | null {
  const value = environment[baseUrlVariable]?.trim();
  if (!value) return null;
  const url = URL.parse(value);
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) throw new Error(`${baseUrlVariable} must be an http or https address such as https://poketype.example.`);
  return url.origin;
}
