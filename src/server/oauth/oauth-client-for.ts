import type { OAuthProvider } from '@/domain/oauth-provider';
import { oauthCallbackUrl, readOAuthCredentials, type OAuthEnvironment } from './oauth-settings';
import { createProviderClient, type OAuthProviderClient } from './provider-client';

export type OAuthClientRequest = { environment: OAuthEnvironment; provider: OAuthProvider; requestOrigin: string };

export function oauthClientFor({ environment, provider, requestOrigin }: OAuthClientRequest): OAuthProviderClient | null {
  const credentials = readOAuthCredentials(environment, provider);
  if (!credentials) return null;
  return createProviderClient(provider, credentials, oauthCallbackUrl(environment, requestOrigin, provider));
}
