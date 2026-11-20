import { randomBytes, randomInt } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { hubDestination } from '../../src/domain/starter-destination';
import { usernamePattern } from '../../src/domain/username';
import { completeOAuthSignIn } from '../../src/server/oauth/complete-oauth-sign-in';
import { signInWithIdentity } from '../../src/server/oauth/identity-sign-in';
import { startOAuthFlow } from '../../src/server/oauth/oauth-flow';
import type { OAuthProviderClient, ProviderIdentity } from '../../src/server/oauth/provider-client';
import { findSessionIdentity } from '../../src/server/sessions/session-store';
import { openTestDatabase } from './support/test-database';

const { database, sql } = openTestDatabase();

afterAll(async () => {
  await sql.end();
});

function uniqueTag(): string {
  return randomBytes(3).toString('hex');
}

function identityNamed(login: string): ProviderIdentity {
  return { providerUserId: String(randomInt(1, 2 ** 47)), login };
}

function clientReturning(identity: ProviderIdentity): OAuthProviderClient {
  return { authorizationUrl: () => new URL('https://provider.invalid/authorize'), fetchIdentity: async () => identity };
}

const hostileLogins = ['Élodie Ç', 'm😀ya', '😀😀😀', 'a', '   ', '-', '__x__', 'x'.repeat(39), 'Ⅻ', '<script>', "'; drop table users;--", 'ıx'];

describe('provider usernames a child could not type', () => {
  it.each(hostileLogins)('turns %j into an account name the database accepts', async (login) => {
    const result = await signInWithIdentity(database, { provider: 'discord', identity: identityNamed(`${login}${uniqueTag()}`), presentedSessionToken: undefined });

    if (result.outcome === 'usernameUnavailable') throw new Error('Expected an account');
    const username = (await findSessionIdentity(database, result.sessionToken))?.account?.username;
    expect(username).toMatch(usernamePattern);
  });
});

describe('a provider username taken with every suffix', () => {
  it('shows "failed" and creates nothing once the name and suffixes 2 to 999 are all taken', async () => {
    const base = `full${uniqueTag()}`;
    const takenNames = [base, ...Array.from({ length: 998 }, (_, index) => `${base}${index + 2}`)];
    await sql`insert into guests (trainer_name) select unnest(${takenNames}::text[])`;
    await sql`insert into users (username, guest_id) select trainer_name, id from guests where trainer_name = any(${takenNames}::text[])`;
    const identity = identityNamed(base);
    const flow = startOAuthFlow({ provider: 'github', destination: hubDestination, presentedSessionToken: undefined, now: Date.now() });

    const result = await completeOAuthSignIn({ database, client: clientReturning(identity) }, { provider: 'github', flow, query: { code: 'provider-code', state: flow.state }, presentedSessionToken: undefined, now: Date.now() });

    expect(result).toMatchObject({ outcome: 'notice', notice: 'failed' });
    const [linked] = await sql`select count(*)::int as total from oauth_identities where provider = 'github' and provider_user_id = ${identity.providerUserId}`;
    expect(linked!.total).toBe(0);
  });
});
