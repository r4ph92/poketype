import type { OAuthNotice } from '@/domain/oauth-notice';
import type { StarterDestination } from '@/domain/starter-destination';
import { entryReturnQuery } from '@/features/guest/entry-destination';
import { noStoreHeaders } from '@/server/http/empty-response';

const seeOther = 303;

export function redirectTo(location: string): Response {
  return new Response(null, { status: seeOther, headers: { ...noStoreHeaders, Location: location } });
}

// The login page shows the notice and keeps the room or invitation, so trying again still returns there.
export function loginNoticePath(notice: OAuthNotice, destination: StarterDestination): string {
  const returnQuery = entryReturnQuery(destination);
  return `/login${returnQuery}${returnQuery ? '&' : '?'}oauth=${notice}`;
}
