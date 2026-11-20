import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import type { InvitationToken } from '../../src/domain/invitation-token';
import { hubDestination } from '../../src/domain/starter-destination';
import { createSecretToken } from '../../src/server/secret-token';
import { checkCallback, decodeOAuthFlow, encodeOAuthFlow, startOAuthFlow, type CallbackRequest, type OAuthFlow } from '../../src/server/oauth/oauth-flow';

const now = Date.UTC(2026, 10, 19, 12);
const guestToken = createSecretToken();
const lifetimeMs = gameConfig.account.oauth.flowLifetimeMinutes * 60_000;

function githubFlow(): OAuthFlow {
  return startOAuthFlow({ provider: 'github', destination: hubDestination, presentedSessionToken: guestToken, now });
}

function callback(flow: OAuthFlow | null, overrides: Partial<CallbackRequest> = {}): CallbackRequest {
  return { provider: 'github', flow, query: { code: 'provider-code', state: flow?.state }, presentedSessionToken: guestToken, now: now + 1000, ...overrides };
}

describe('starting a provider sign-in', () => {
  it('draws a fresh 256-bit state and PKCE verifier for every flow', () => {
    const first = githubFlow();
    const second = githubFlow();
    expect(first.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.state).not.toBe(second.state);
    expect(first.codeVerifier).not.toBe(first.state);
  });

  it('expires after the configured lifetime and keeps only a hash of the session token', () => {
    const flow = githubFlow();
    expect(flow.expiresAt).toBe(now + lifetimeMs);
    expect(flow.sessionBinding).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(flow)).not.toContain(guestToken);
  });

  it('carries the room or invitation the player was going to', () => {
    const token = createSecretToken() as InvitationToken;
    const flow = startOAuthFlow({ provider: 'discord', destination: { kind: 'invite', token }, presentedSessionToken: undefined, now });
    expect(flow.destination).toBe(`invite:${token}`);
    expect(flow.sessionBinding).toBeNull();
  });

  it('survives the cookie round trip and refuses anything else', () => {
    const flow = githubFlow();
    expect(decodeOAuthFlow(encodeOAuthFlow(flow))).toEqual(flow);
    expect(decodeOAuthFlow(undefined)).toBeNull();
    expect(decodeOAuthFlow('not-a-flow')).toBeNull();
    expect(decodeOAuthFlow(Buffer.from(JSON.stringify({ ...flow, extra: 1 })).toString('base64url'))).toBeNull();
    expect(decodeOAuthFlow(Buffer.from(JSON.stringify({ ...flow, provider: 'google' })).toString('base64url'))).toBeNull();
    expect(decodeOAuthFlow('a'.repeat(5000))).toBeNull();
  });
});

describe('checking the provider callback', () => {
  it('accepts the callback of the flow this browser started', () => {
    const flow = githubFlow();
    expect(checkCallback(callback(flow))).toEqual({ outcome: 'accepted', code: 'provider-code', flow });
  });

  it('accepts a flow started without any session when the callback has none either', () => {
    const flow = startOAuthFlow({ provider: 'github', destination: hubDestination, presentedSessionToken: undefined, now });
    expect(checkCallback(callback(flow, { presentedSessionToken: undefined })).outcome).toBe('accepted');
  });

  it('refuses a forged state value', () => {
    const flow = githubFlow();
    expect(checkCallback(callback(flow, { query: { code: 'provider-code', state: createSecretToken() } }))).toEqual({ outcome: 'notice', notice: 'refused' });
    expect(checkCallback(callback(flow, { query: { code: 'provider-code', state: flow.state.slice(1) } }))).toEqual({ outcome: 'notice', notice: 'refused' });
  });

  it('refuses a replayed callback once the flow cookie is gone', () => {
    const flow = githubFlow();
    expect(checkCallback(callback(null, { query: { code: 'provider-code', state: flow.state } }))).toEqual({ outcome: 'notice', notice: 'refused' });
  });

  it('refuses an expired flow, another provider, or another session', () => {
    const flow = githubFlow();
    expect(checkCallback(callback(flow, { now: now + lifetimeMs })).outcome).toBe('notice');
    expect(checkCallback(callback(flow, { provider: 'discord' })).outcome).toBe('notice');
    expect(checkCallback(callback(flow, { presentedSessionToken: createSecretToken() })).outcome).toBe('notice');
    expect(checkCallback(callback(flow, { presentedSessionToken: undefined })).outcome).toBe('notice');
  });

  it('refuses a callback without a code or state, or with over-long values', () => {
    const flow = githubFlow();
    expect(checkCallback(callback(flow, { query: { state: flow.state } })).outcome).toBe('notice');
    expect(checkCallback(callback(flow, { query: { code: 'provider-code' } })).outcome).toBe('notice');
    expect(checkCallback(callback(flow, { query: { code: 'c'.repeat(513), state: flow.state } })).outcome).toBe('notice');
  });

  it('reports a cancellation on the provider page, even without a flow', () => {
    expect(checkCallback(callback(githubFlow(), { query: { error: 'access_denied', state: 'x' } }))).toEqual({ outcome: 'notice', notice: 'cancelled' });
    expect(checkCallback(callback(null, { query: { error: 'access_denied' } }))).toEqual({ outcome: 'notice', notice: 'cancelled' });
  });

  it('reports any other provider error as a failed sign-in', () => {
    expect(checkCallback(callback(githubFlow(), { query: { error: 'server_error' } }))).toEqual({ outcome: 'notice', notice: 'failed' });
  });
});
