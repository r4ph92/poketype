export const oauthProviders = ['github', 'discord'] as const;

export type OAuthProvider = (typeof oauthProviders)[number];

export const oauthProviderNames: Record<OAuthProvider, string> = { github: 'GitHub', discord: 'Discord' };

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return oauthProviders.some((provider) => provider === value);
}
