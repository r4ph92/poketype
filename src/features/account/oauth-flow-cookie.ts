import 'server-only';
import { cookies } from 'next/headers';
import { gameConfig } from '@/config/game';
import { decodeOAuthFlow, encodeOAuthFlow, type OAuthFlow } from '@/server/oauth/oauth-flow';

const flowCookieName = 'poketype_oauth';
const flowCookiePath = '/auth';

export async function readOAuthFlowCookie(): Promise<OAuthFlow | null> {
  return decodeOAuthFlow((await cookies()).get(flowCookieName)?.value);
}

// Lax still sends it on the provider's top-level redirect back; the path keeps it off every other request.
export async function writeOAuthFlowCookie(flow: OAuthFlow): Promise<void> {
  (await cookies()).set(flowCookieName, encodeOAuthFlow(flow), {
    httpOnly: true,
    sameSite: 'lax',
    path: flowCookiePath,
    secure: process.env.NODE_ENV === 'production',
    maxAge: gameConfig.account.oauth.flowLifetimeMinutes * 60,
  });
}

export async function clearOAuthFlowCookie(): Promise<void> {
  (await cookies()).delete({ name: flowCookieName, path: flowCookiePath });
}
