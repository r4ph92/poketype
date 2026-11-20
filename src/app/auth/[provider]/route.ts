import type { NextRequest } from 'next/server';
import { entryReturnDestination } from '@/features/guest/entry-destination';
import { writeOAuthFlowCookie } from '@/features/account/oauth-flow-cookie';
import { loginNoticePath, redirectTo } from '@/features/account/oauth-redirects';
import { emptyResponse } from '@/server/http/empty-response';
import { oauthClientFor } from '@/server/oauth/oauth-client-for';
import { startOAuthFlow } from '@/server/oauth/oauth-flow';
import { findCurrentSession } from '@/server/sessions/current-session';
import { readSessionCookie } from '@/server/sessions/session-cookie';
import { oauthRouteParamsSchema } from '@/server/validation/oauth-schemas';

type ProviderRouteContext = { params: Promise<{ provider: string }> };

const notFound = 404;

// A plain link starts the flow: the CSP's form-action 'self' would block a form post that redirects to the provider.
export async function GET(request: NextRequest, { params }: ProviderRouteContext): Promise<Response> {
  const route = oauthRouteParamsSchema.safeParse(await params);
  if (!route.success) return emptyResponse(notFound);
  if ((await findCurrentSession())?.account) return redirectTo('/play');
  const { searchParams, origin } = request.nextUrl;
  const destination = entryReturnDestination({ returnRoomId: searchParams.get('room'), inviteToken: searchParams.get('invite') });
  const client = oauthClientFor({ environment: process.env, provider: route.data.provider, requestOrigin: origin });
  if (!client) return redirectTo(loginNoticePath('unavailable', destination));
  const flow = startOAuthFlow({ provider: route.data.provider, destination, presentedSessionToken: await readSessionCookie(), now: Date.now() });
  await writeOAuthFlowCookie(flow);
  return redirectTo(client.authorizationUrl(flow.state, flow.codeVerifier).toString());
}
