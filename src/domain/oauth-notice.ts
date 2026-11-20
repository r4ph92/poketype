// What the login page tells a player coming back from a provider without a session.
export const oauthNotices = ['cancelled', 'refused', 'failed', 'unavailable'] as const;

export type OAuthNotice = (typeof oauthNotices)[number];

export function parseOAuthNotice(value: unknown): OAuthNotice | null {
  return oauthNotices.find((notice) => notice === value) ?? null;
}
