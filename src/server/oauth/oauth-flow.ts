import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { gameConfig } from '@/config/game';
import type { OAuthNotice } from '@/domain/oauth-notice';
import type { OAuthProvider } from '@/domain/oauth-provider';
import { encodeStarterDestination, type StarterDestination } from '@/domain/starter-destination';
import { createSecretToken, hashSecretToken } from '../secret-token';
import { oauthCallbackQuerySchema, oauthFlowSchema } from '../validation/oauth-schemas';

// What the browser keeps between leaving for the provider and coming back: never sent anywhere but this site's /auth paths.
export type OAuthFlow = z.infer<typeof oauthFlowSchema>;

export type CallbackQuery = z.input<typeof oauthCallbackQuerySchema>;

export type FlowStart = { provider: OAuthProvider; destination: StarterDestination; presentedSessionToken: string | undefined; now: number };

export type CallbackRequest = { provider: OAuthProvider; flow: OAuthFlow | null; query: CallbackQuery; presentedSessionToken: string | undefined; now: number };

export type AcceptedCallback = { outcome: 'accepted'; code: string; flow: OAuthFlow };

export type CallbackCheck = AcceptedCallback | { outcome: 'notice'; notice: OAuthNotice };

const maxEncodedLength = 1024;
const cancelledByUser = 'access_denied';
const refused: CallbackCheck = { outcome: 'notice', notice: 'refused' };

export function startOAuthFlow({ provider, destination, presentedSessionToken, now }: FlowStart): OAuthFlow {
  const expiresAt = now + gameConfig.account.oauth.flowLifetimeMinutes * 60_000;
  const binding = sessionBinding(presentedSessionToken);
  return { provider, state: createSecretToken(), codeVerifier: createSecretToken(), destination: encodeStarterDestination(destination), sessionBinding: binding, expiresAt };
}

export function encodeOAuthFlow(flow: OAuthFlow): string {
  return Buffer.from(JSON.stringify(flow)).toString('base64url');
}

export function decodeOAuthFlow(value: string | undefined): OAuthFlow | null {
  if (!value || value.length > maxEncodedLength) return null;
  const parsed = oauthFlowSchema.safeParse(parseJson(Buffer.from(value, 'base64url').toString('utf8')));
  return parsed.success ? parsed.data : null;
}

// A cancellation is answered even without a flow: it creates nothing, and an expired flow should still say "cancelled".
export function checkCallback(request: CallbackRequest): CallbackCheck {
  const query = oauthCallbackQuerySchema.safeParse(request.query);
  if (!query.success) return refused;
  const { code, state, error } = query.data;
  if (error) return { outcome: 'notice', notice: error === cancelledByUser ? 'cancelled' : 'failed' };
  const flow = request.flow;
  if (!flow || !code || !state || !isFlowFor(flow, request)) return refused;
  return isSameSecret(state, flow.state) ? { outcome: 'accepted', code, flow } : refused;
}

function isFlowFor(flow: OAuthFlow, { provider, presentedSessionToken, now }: CallbackRequest): boolean {
  if (flow.provider !== provider || flow.expiresAt <= now) return false;
  return flow.sessionBinding === sessionBinding(presentedSessionToken);
}

// The flow is tied to the session that started it, so a callback reaching another session (or a fixed one) is refused.
function sessionBinding(token: string | undefined): string | null {
  return token ? hashSecretToken(token) : null;
}

function isSameSecret(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
