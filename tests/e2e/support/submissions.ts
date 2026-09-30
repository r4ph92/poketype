import type { APIRequestContext, APIResponse, Page } from '@playwright/test';
import { submitTrainerName } from './guests';

export type CapturedSubmission = { headers: Record<string, string>; body: Buffer };

export async function captureEntrySubmission(page: Page, name: string): Promise<CapturedSubmission> {
  const captured = new Promise<CapturedSubmission>((resolve) => {
    void page.route('/', async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.continue();
      resolve({ headers: headersWithout(request.headers(), ['content-length']), body: request.postDataBuffer()! });
      return route.abort();
    });
  });
  await submitTrainerName(page, name);
  return captured;
}

export async function replaySubmission(
  request: APIRequestContext,
  captured: CapturedSubmission,
  headers: Record<string, string>,
): Promise<APIResponse> {
  return request.post('/', { headers, data: captured.body, maxRedirects: 0 });
}

export function grantsSessionCookie(response: APIResponse, cookieName: string): boolean {
  return response
    .headersArray()
    .filter(({ name }) => name.toLowerCase() === 'set-cookie')
    .some(({ value }) => value.startsWith(`${cookieName}=`));
}

export function headersWithout(headers: Record<string, string>, names: string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !names.includes(name)));
}
