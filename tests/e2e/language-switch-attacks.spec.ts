import { expect, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test';
import { localeButton, localeCookieName, setLocaleCookie } from './support/locale';
import { grantsSessionCookie, headersWithout, type CapturedSubmission } from './support/submissions';

test.use({ javaScriptEnabled: false });

const tamperedCookieValues = ['de', '<script>alert(1)</script>', 'EN', '%3Cscript%3E', '%00', 'a'.repeat(3000), ''];

async function captureSwitchSubmission(page: Page): Promise<CapturedSubmission> {
  const captured = new Promise<CapturedSubmission>((resolve) => {
    void page.route('**/*', async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.continue();
      resolve({ headers: headersWithout(request.headers(), ['content-length', 'cookie']), body: request.postDataBuffer()! });
      return route.abort();
    });
  });
  await localeButton(page, 'en').click();
  return captured;
}

function withFormValue(captured: CapturedSubmission, field: string, value: string): Buffer {
  const pattern = new RegExp(`(name="${field}"\\r\\n\\r\\n)[^\\r]*`);
  return Buffer.from(captured.body.toString('utf8').replace(pattern, `$1${value}`));
}

async function replayWith(request: APIRequestContext, captured: CapturedSubmission, data: Buffer, headers = captured.headers): Promise<APIResponse> {
  return request.post('/', { headers, data, maxRedirects: 0 });
}

function redirectLocation(response: APIResponse): string | undefined {
  return response.headers()['location'];
}

test.describe('tampered language cookie', () => {
  for (const value of tamperedCookieValues) {
    test(`"${value.slice(0, 20)}" renders French without error`, async ({ page, context }) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(error.message));
      await setLocaleCookie(context, value);
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
      expect(problems).toEqual([]);
    });
  }

  test('a raw Cookie header with a script value renders French', async ({ request }) => {
    const response = await request.get('/nimporte-quoi', { headers: { Cookie: `${localeCookieName}=<script>alert(1)</script>` } });
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain('<html lang="fr"');
  });
});

test.describe('tampered switch submission', () => {
  test('a language other than fr or en changes nothing and does not fail', async ({ page, request }) => {
    await page.goto('/');
    const captured = await captureSwitchSubmission(page);
    const response = await replayWith(request, captured, withFormValue(captured, 'locale', 'de'));
    expect(response.status()).toBe(303);
    expect(grantsSessionCookie(response, localeCookieName)).toBe(false);
  });

  for (const target of ['//evil.example', 'https://evil.example', '/\\evil.example', 'javascript:alert(1)', '/a/..//evil.example']) {
    test(`return address ${target} lands on the home page of this site, cookie still set`, async ({ page, request }) => {
      await page.goto('/');
      const captured = await captureSwitchSubmission(page);
      const response = await replayWith(request, captured, withFormValue(captured, 'returnTo', target));
      expect(response.status()).toBe(303);
      expect(new URL(redirectLocation(response)!, 'http://localhost').origin).toBe('http://localhost');
      expect(redirectLocation(response)).toBe('/');
      expect(grantsSessionCookie(response, localeCookieName)).toBe(true);
    });
  }

  test('a cross-site replay is refused and sets no cookie', async ({ page, request }) => {
    await page.goto('/');
    const captured = await captureSwitchSubmission(page);
    const response = await replayWith(request, captured, captured.body, { ...captured.headers, origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' });
    expect(response.status()).toBe(403);
    expect(grantsSessionCookie(response, localeCookieName)).toBe(false);
  });
});
