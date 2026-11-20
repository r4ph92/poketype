import type { NextRequest } from 'next/server';
import { clearOAuthFlowCookie, readOAuthFlowCookie } from '@/features/account/oauth-flow-cookie';
import { loginNoticePath, redirectTo } from '@/features/account/oauth-redirects';
import { database } from '@/server/db/client';
import { emptyResponse } from '@/server/http/empty-response';
import { completeOAuthSignIn } from '@/server/oauth/complete-oauth-sign-in';
import { oauthClientFor } from '@/server/oauth/oauth-client-for';
import type { CallbackQuery } from '@/server/oauth/oauth-flow';
import { readSessionCookie, writeSessionCookie } from '@/server/sessions/session-cookie';
import { oauthRouteParamsSchema } from '@/server/validation/oauth-schemas';

type ProviderRouteContext = { params: Promise<{ provider: string }> };

const notFound = 404;

// The flow cookie is cleared before anything else, so a state value can be presented once only.
export async function GET(request: NextRequest, { params }: ProviderRouteContext): Promise<Response> {
  const route = oauthRouteParamsSchema.safeParse(await params);
  if (!route.success) return emptyResponse(notFound);
  const provider = route.data.provider;
  const flow = await readOAuthFlowCookie();
  await clearOAuthFlowCookie();
  const client = oauthClientFor({ environment: process.env, provider, requestOrigin: request.nextUrl.origin });
  const callback = { provider, flow, query: readCallbackQuery(request.nextUrl.searchParams), presentedSessionToken: await readSessionCookie(), now: Date.now() };
  const result = await completeOAuthSignIn({ database, client }, callback);
  if (result.outcome === 'notice') return redirectTo(loginNoticePath(result.notice, result.destination));
  await writeSessionCookie(result.sessionToken);
  return redirectTo(result.redirectPath);
}

function readCallbackQuery(searchParams: URLSearchParams): CallbackQuery {
  return { code: searchParams.get('code') ?? undefined, state: searchParams.get('state') ?? undefined, error: searchParams.get('error') ?? undefined };
}
