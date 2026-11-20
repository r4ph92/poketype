import { randomBytes, randomInt } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import type { OAuthProvider } from '../../src/domain/oauth-provider';
import type { RoomId } from '../../src/domain/room-id';
import { hubDestination, type StarterDestination } from '../../src/domain/starter-destination';
import { insertAccount } from '../../src/server/accounts/account-commands';
import { completeOAuthSignIn, type OAuthCallbackResult } from '../../src/server/oauth/complete-oauth-sign-in';
import { signInWithIdentity } from '../../src/server/oauth/identity-sign-in';
import { startOAuthFlow, type CallbackQuery, type OAuthFlow } from '../../src/server/oauth/oauth-flow';
import type { OAuthProviderClient, ProviderIdentity } from '../../src/server/oauth/provider-client';
import { createSecretToken } from '../../src/server/secret-token';
import { createGuestSession, findSessionIdentity } from '../../src/server/sessions/session-store';
import { hashSessionToken } from '../../src/server/sessions/session-token';
import { openTestDatabase } from './support/test-database';

const { database, sql } = openTestDatabase();
const scryptShapedHash = '$scrypt$ln=16,r=8,p=2$c2FsdA$aGFzaA';
const providers: OAuthProvider[] = ['github', 'discord'];

afterAll(async () => {
  await sql.end();
});

type StubClient = OAuthProviderClient & { calls: number };

function stubClient(identity: ProviderIdentity | Error): StubClient {
  const client: StubClient = {
    calls: 0,
    authorizationUrl: () => new URL('https://provider.invalid/authorize'),
    fetchIdentity: async () => {
      client.calls += 1;
      if (identity instanceof Error) throw identity;
      return identity;
    },
  };
  return client;
}

function uniqueLogin(): string {
  return `maya${randomBytes(4).toString('hex')}`;
}

function uniqueIdentity(login = uniqueLogin()): ProviderIdentity {
  return { providerUserId: String(randomInt(1, 2 ** 47)), login };
}

function flowFor(provider: OAuthProvider, presentedSessionToken: string | undefined, destination: StarterDestination = hubDestination): OAuthFlow {
  return startOAuthFlow({ provider, destination, presentedSessionToken, now: Date.now() });
}

type Callback = { provider: OAuthProvider; flow: OAuthFlow | null; client: StubClient; presentedSessionToken?: string; query?: CallbackQuery };

function returnFromProvider({ provider, flow, client, presentedSessionToken, query }: Callback): Promise<OAuthCallbackResult> {
  const callbackQuery = query ?? { code: 'provider-code', state: flow?.state };
  return completeOAuthSignIn({ database, client }, { provider, flow, query: callbackQuery, presentedSessionToken, now: Date.now() });
}

// Counted per identity, not per table: other test files insert accounts and sessions in parallel.
async function accountsOf(identity: ProviderIdentity): Promise<number> {
  const [row] = await sql`select count(*)::int as total from users where username like ${identity.login + '%'}`;
  return row!.total as number;
}

async function sessionsOf(identity: ProviderIdentity): Promise<number> {
  const [row] = await sql`select count(*)::int as total from sessions join users on users.id = sessions.user_id where users.username like ${identity.login + '%'}`;
  return row!.total as number;
}

async function accountOf(sessionToken: string) {
  return (await findSessionIdentity(database, sessionToken))?.account ?? null;
}

function signedInToken(result: OAuthCallbackResult): string {
  if (result.outcome !== 'signedIn') throw new Error(`Expected a sign-in, got ${result.notice}`);
  return result.sessionToken;
}

describe.each(providers)('signing in with %s against the real database', (provider) => {
  it('creates an account on first use with the provider username and logs the player in', async () => {
    const identity = uniqueIdentity();
    const result = await returnFromProvider({ provider, flow: flowFor(provider, undefined), client: stubClient(identity) });

    expect(result).toMatchObject({ outcome: 'signedIn', redirectPath: '/choose-trainer' });
    expect(await accountOf(signedInToken(result))).toMatchObject({ username: identity.login });
    const [linked] = await sql`select u.username from oauth_identities i join users u on u.id = i.user_id where i.provider = ${provider} and i.provider_user_id = ${identity.providerUserId}`;
    expect(linked!.username).toBe(identity.login);
  });

  it('adds a numeric suffix when the provider username is already taken, in any letter case', async () => {
    const login = uniqueLogin();
    await database.transaction((transaction) => insertAccount(transaction, { username: login.toUpperCase(), passwordHash: scryptShapedHash }));

    const result = await returnFromProvider({ provider, flow: flowFor(provider, undefined), client: stubClient(uniqueIdentity(login)) });

    expect(await accountOf(signedInToken(result))).toMatchObject({ username: `${login}2` });
  });

  it('attaches the presenting guest, so its races and collection move into the account, and retires its old sessions', async () => {
    const guest = await createGuestSession(database, 'Invitee');
    const result = await returnFromProvider({ provider, flow: flowFor(provider, guest.token), client: stubClient(uniqueIdentity()), presentedSessionToken: guest.token });

    const sessionToken = signedInToken(result);
    expect((await findSessionIdentity(database, sessionToken))?.guest.id).toBe(guest.guestId);
    expect(await findSessionIdentity(database, guest.token)).toBeNull();
    const [retired] = await sql`select expires_at <= now() as is_expired from sessions where token_hash = ${hashSessionToken(guest.token)}`;
    expect(retired!.is_expired).toBe(true);
    expect(sessionToken).not.toBe(guest.token);
  });

  it('reaches the same account the second time, with no duplicate, and returns to the room the player came from', async () => {
    const identity = uniqueIdentity();
    const first = signedInToken(await returnFromProvider({ provider, flow: flowFor(provider, undefined), client: stubClient(identity) }));
    const guest = await createGuestSession(database, 'Revient');
    const room: StarterDestination = { kind: 'room', roomId: '0d6f8c3e-1d2a-4b7c-9e8f-123456789abc' as RoomId };
    const usersBefore = await accountsOf(identity);

    const second = await returnFromProvider({ provider, flow: flowFor(provider, guest.token, room), client: stubClient(identity), presentedSessionToken: guest.token });

    expect(second).toMatchObject({ outcome: 'signedIn', redirectPath: '/rooms/0d6f8c3e-1d2a-4b7c-9e8f-123456789abc' });
    expect((await accountOf(signedInToken(second)))?.id).toBe((await accountOf(first))?.id);
    expect(await accountsOf(identity)).toBe(usersBefore);
    expect(await findSessionIdentity(database, guest.token)).toBeNull();
  });

  it('creates one account when two callbacks for the same provider account arrive at once', async () => {
    const identity = uniqueIdentity();
    const results = await Promise.all([0, 1].map(() => signInWithIdentity(database, { provider, identity, presentedSessionToken: undefined })));

    expect(results.map(({ outcome }) => outcome).sort()).toEqual(['created', 'loggedIn']);
    const [linked] = await sql`select count(*)::int as total from oauth_identities where provider = ${provider} and provider_user_id = ${identity.providerUserId}`;
    expect(linked!.total).toBe(1);
  });

  it('shows "cancelled" and creates nothing when the player cancels on the provider page', async () => {
    const identity = uniqueIdentity();
    const client = stubClient(identity);

    const result = await returnFromProvider({ provider, flow: flowFor(provider, undefined), client, query: { error: 'access_denied', state: 'whatever' } });

    expect(result).toMatchObject({ outcome: 'notice', notice: 'cancelled' });
    expect(client.calls).toBe(0);
    expect(await accountsOf(identity)).toBe(0);
  });

  it('refuses a forged state without calling the provider or creating a session', async () => {
    const identity = uniqueIdentity();
    const client = stubClient(identity);

    const result = await returnFromProvider({ provider, flow: flowFor(provider, undefined), client, query: { code: 'provider-code', state: createSecretToken() } });

    expect(result).toMatchObject({ outcome: 'notice', notice: 'refused' });
    expect(client.calls).toBe(0);
    expect(await sessionsOf(identity)).toBe(0);
  });

  it('refuses a replayed callback once its flow has been used', async () => {
    const flow = flowFor(provider, undefined);
    const identity = uniqueIdentity();
    const client = stubClient(identity);
    signedInToken(await returnFromProvider({ provider, flow, client }));
    const sessionsBefore = await sessionsOf(identity);

    const replay = await returnFromProvider({ provider, flow: null, client, query: { code: 'provider-code', state: flow.state } });

    expect(replay).toMatchObject({ outcome: 'notice', notice: 'refused' });
    expect(client.calls).toBe(1);
    expect(await sessionsOf(identity)).toBe(sessionsBefore);
  });

  it('reports a provider failure and creates nothing', async () => {
    const result = await returnFromProvider({ provider, flow: flowFor(provider, undefined), client: stubClient(new Error('network down')) });

    expect(result).toMatchObject({ outcome: 'notice', notice: 'failed' });
  });

  it('answers "unavailable" when the provider has no credentials', async () => {
    const flow = flowFor(provider, undefined);
    const result = await completeOAuthSignIn({ database, client: null }, { provider, flow, query: { code: 'provider-code', state: flow.state }, presentedSessionToken: undefined, now: Date.now() });

    expect(result).toMatchObject({ outcome: 'notice', notice: 'unavailable' });
  });
});
