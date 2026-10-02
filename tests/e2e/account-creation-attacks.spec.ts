import { expect, test, type Page, type Response } from '@playwright/test';
import fr from '../../messages/fr.json';
import {
  captureSignUpSubmission,
  countUsersNamed,
  findAccount,
  replaySignUp,
  signUp,
  submitSignUp,
  uniquePassword,
  uniqueUsername,
} from './support/accounts';
import { enterAsGuest, readSessionToken, sessionCookieName, setSessionCookie, uniqueName, withTestDatabase } from './support/guests';
import { createRoom } from './support/rooms';
import { grantsSessionCookie, headersWithout } from './support/submissions';

type RecordedResponse = { url: string; text: string };

function recordResponses(page: Page): RecordedResponse[] {
  const recorded: RecordedResponse[] = [];
  page.on('response', async (response: Response) => {
    const headers = JSON.stringify(response.headersArray());
    const body = await response
      .body()
      .then((buffer) => buffer.toString('utf8'))
      .catch(() => '');
    recorded.push({ url: response.url(), text: `${headers}\n${body}` });
  });
  return recorded;
}

function secretParts(passwordHash: string): string[] {
  const [, , , salt, key] = passwordHash.split('$');
  return [passwordHash, salt!, key!];
}

async function expectNoSecretIn(recorded: RecordedResponse[], secrets: string[]): Promise<void> {
  expect(recorded.length).toBeGreaterThan(3);
  for (const { url, text } of recorded) {
    for (const secret of secrets) expect(text.includes(secret), `${url} reveals a secret`).toBe(false);
  }
}

async function signUpWhileRecording(page: Page): Promise<{ recorded: RecordedResponse[]; secrets: string[] }> {
  const recorded = recordResponses(page);
  const username = uniqueUsername();
  const password = uniquePassword();
  await submitSignUp(page, { username, password, confirmation: `${password}x` });
  await submitSignUp(page, { username, password: password.slice(0, 7) });
  await signUp(page, { username, password });
  await createRoom(page);
  await page.reload();
  const account = await findAccount(username);
  return { recorded, secrets: [password, ...secretParts(account!.passwordHash)] };
}

test.describe('the password never leaves the server', () => {
  test('no page, action response or header carries the password, its hash or its salt', async ({ page }) => {
    const { recorded, secrets } = await signUpWhileRecording(page);
    await page.waitForLoadState('networkidle');
    await expectNoSecretIn(recorded, secrets);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('no server-rendered page or redirect carries the password, its hash or its salt', async ({ page }) => {
      const { recorded, secrets } = await signUpWhileRecording(page);
      await expectNoSecretIn(recorded, secrets);
    });
  });

  test('no stored row other than the credential holds the password or its hash', async ({ page }) => {
    const username = uniqueUsername();
    const password = uniquePassword();
    await signUp(page, { username, password });
    const account = await findAccount(username);
    const rows = await withTestDatabase(async (sql) => {
      const found = await sql`
        select row_to_json(users)::text as row from users where id = ${account!.userId}
        union all select row_to_json(guests)::text from guests where id = ${account!.guestId}
        union all select row_to_json(sessions)::text from sessions where guest_id = ${account!.guestId}`;
      return found.map(({ row }) => row as string);
    });
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).not.toContain(password);
      expect(row).not.toContain(account!.passwordHash);
    }
  });

  test('no column outside the credential table looks like a password', async () => {
    const columns = await withTestDatabase(async (sql) => {
      const found = await sql`
        select table_name, column_name from information_schema.columns
        where table_schema = 'public' and column_name ilike '%pass%' and column_name not ilike 'passage%'`;
      return found.map(({ table_name, column_name }) => `${table_name}.${column_name}`);
    });
    expect(columns).toEqual(['password_credentials.password_hash']);
  });
});

test.describe('forged sign up requests', () => {
  test('a replay without Origin is refused with 403 and creates nothing', async ({ page, request }) => {
    const username = uniqueUsername();
    const captured = await captureSignUpSubmission(page, { username, password: uniquePassword() });
    const refused = await replaySignUp(request, captured, { headers: headersWithout(captured.headers, ['origin']) });
    expect(refused.status()).toBe(403);
    expect(await countUsersNamed(username)).toBe(0);

    const control = await replaySignUp(request, captured);
    expect(grantsSessionCookie(control, sessionCookieName), 'control: the same replay from the app origin works').toBe(true);
    expect(await countUsersNamed(username)).toBe(1);
  });

  test('two browsers signing up "Race_x" and "race_x" at the same moment create one account and no server error', async ({ browser }) => {
    const base = uniqueUsername('Race_');
    const pages = await Promise.all([0, 1].map(async () => (await browser.newContext()).newPage()));
    const outcomes = await Promise.all(
      [base, base.toUpperCase()].map(async (username, index) => {
        const page = pages[index]!;
        await submitSignUp(page, { username, password: uniquePassword() });
        const settled = page.locator('#signup-username-error').or(page.getByRole('navigation', { name: fr.AccountBar.label }).locator('p'));
        await expect(settled).toBeVisible();
        return new URL(page.url()).pathname;
      }),
    );
    expect(outcomes.sort()).toEqual(['/choose-trainer', '/signup']);
    const refused = pages.find((page) => page.url().endsWith('/signup'))!;
    await expect(refused.locator('#signup-username-error')).toHaveText(fr.SignUp.errors.username.taken);
    expect(await countUsersNamed(base)).toBe(1);
    await Promise.all(pages.map((page) => page.context().close()));
  });
});

test.describe('session fixation', () => {
  test("a guest token planted in Maya's browser is not upgraded to her account", async ({ browser, page }) => {
    await enterAsGuest(page, uniqueName('Mallory '));
    const plantedToken = await readSessionToken(page.context());

    const maya = await browser.newContext();
    await setSessionCookie(maya, plantedToken);
    const mayaPage = await maya.newPage();
    await signUp(mayaPage, { username: uniqueUsername(), password: uniquePassword() });
    expect(await readSessionToken(maya)).not.toBe(plantedToken);

    await page.goto('/play');
    await expect(page).toHaveURL('/');
    await maya.close();
  });
});

test.describe('database rules behind the form', () => {
  const rejects = async (statement: (sql: Parameters<Parameters<typeof withTestDatabase>[0]>[0]) => Promise<unknown>) =>
    withTestDatabase(async (sql) =>
      statement(sql).then(
        () => 'accepted',
        (error: { code?: string }) => error.code ?? 'error',
      ),
    );

  test('usernames outside the rule, duplicates in another case, plain passwords and mismatched sessions are refused', async ({ page }) => {
    const username = uniqueUsername();
    await signUp(page, { username, password: uniquePassword() });
    const account = await findAccount(username);
    const [guest] = await withTestDatabase((sql) => sql`insert into guests (trainer_name) values ('Intrus') returning id`);

    expect(await rejects((sql) => sql`insert into users (username, guest_id) values ('a b', ${guest!.id})`)).toBe('23514');
    expect(await rejects((sql) => sql`insert into users (username, guest_id) values ('ab', ${guest!.id})`)).toBe('23514');
    expect(await rejects((sql) => sql`insert into users (username, guest_id) values (${username.toUpperCase()}, ${guest!.id})`)).toBe(
      '23505',
    );
    expect(await rejects((sql) => sql`insert into users (username, guest_id) values (${uniqueUsername()}, ${account!.guestId})`)).toBe(
      '23505',
    );
    expect(
      await rejects((sql) => sql`update password_credentials set password_hash = 'plain-text' where user_id = ${account!.userId}`),
    ).toBe('23514');
    expect(
      await rejects(
        (sql) =>
          sql`insert into sessions (token_hash, guest_id, user_id, expires_at) values (${uniqueName()}, ${guest!.id}, ${account!.userId}, now())`,
      ),
    ).toBe('23503');
  });
});

test.describe('crafted server action call', () => {
  test.use({ javaScriptEnabled: false });

  test('arguments that are not form data are answered without a server error', async ({ page, request }) => {
    const captured = await captureSignUpSubmission(page, { username: '', password: '' });
    const actionId = /"id":"([0-9a-f]+)"/.exec(captured.body.toString('latin1'))![1]!;
    const headers = { ...withoutContentType(captured.headers), 'next-action': actionId, 'content-type': 'text/plain;charset=UTF-8' };
    const response = await request.post('/signup', { headers, data: '[null,null]', maxRedirects: 0 });
    expect(response.status()).toBeLessThan(500);
  });
});

function withoutContentType(headers: Record<string, string>): Record<string, string> {
  return headersWithout(headers, ['content-type']);
}
