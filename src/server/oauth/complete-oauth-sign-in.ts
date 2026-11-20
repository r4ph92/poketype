import { OAuth2RequestError } from 'arctic';
import type { OAuthNotice } from '@/domain/oauth-notice';
import { oauthProviderNames, type OAuthProvider } from '@/domain/oauth-provider';
import { parseStarterDestination, pathOf, type StarterDestination } from '@/domain/starter-destination';
import type { Database } from '../db/types';
import { signInWithIdentity } from './identity-sign-in';
import { checkCallback, type AcceptedCallback, type CallbackRequest } from './oauth-flow';
import type { OAuthProviderClient, ProviderIdentity } from './provider-client';

export type OAuthCallbackDependencies = { database: Database; client: OAuthProviderClient | null };

export type OAuthCallbackResult =
  | { outcome: 'signedIn'; sessionToken: string; redirectPath: string }
  | { outcome: 'notice'; notice: OAuthNotice; destination: StarterDestination };

const newAccountPath = '/choose-trainer';

// The provider is only called once the callback proves it belongs to the flow this browser started.
export async function completeOAuthSignIn({ database, client }: OAuthCallbackDependencies, request: CallbackRequest): Promise<OAuthCallbackResult> {
  const destination = parseStarterDestination(request.flow?.destination);
  const check = checkCallback(request);
  if (check.outcome === 'notice') return { outcome: 'notice', notice: check.notice, destination };
  if (!client) return { outcome: 'notice', notice: 'unavailable', destination };
  const identity = await fetchIdentityOrNull(client, request.provider, check);
  if (!identity) return { outcome: 'notice', notice: 'failed', destination };
  const result = await signInWithIdentity(database, { provider: request.provider, identity, presentedSessionToken: request.presentedSessionToken });
  if (result.outcome === 'usernameUnavailable') return { outcome: 'notice', notice: 'failed', destination };
  return { outcome: 'signedIn', sessionToken: result.sessionToken, redirectPath: result.outcome === 'created' ? newAccountPath : pathOf(destination) };
}

// Only the error's kind is logged: provider answers can echo the code or carry tokens.
async function fetchIdentityOrNull(client: OAuthProviderClient, provider: OAuthProvider, { code, flow }: AcceptedCallback): Promise<ProviderIdentity | null> {
  try {
    return await client.fetchIdentity(code, flow.codeVerifier);
  } catch (error) {
    console.error(`${oauthProviderNames[provider]} sign-in failed at the provider (${errorKind(error)}).`);
    return null;
  }
}

function errorKind(error: unknown): string {
  if (error instanceof OAuth2RequestError) return error.code;
  return error instanceof Error ? error.name : 'unknown';
}
