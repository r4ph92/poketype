import { gameConfig } from '@/config/game';
import type { OAuthProvider } from './oauth-provider';

const { minLength, maxLength } = gameConfig.account.username;
const firstSuffix = 2;
const combiningMarks = /\p{M}/gu;
const disallowedRuns = /[^A-Za-z0-9_-]+/g;

// The provider name is mapped into the username rule; the first free candidate wins, so "maya" becomes "maya2" when taken.
export function oauthUsernameCandidates(providerLogin: string, provider: OAuthProvider): string[] {
  const base = usernameBase(providerLogin, provider);
  const suffixes = Array.from({ length: gameConfig.account.oauth.maxUsernameSuffix - firstSuffix + 1 }, (_, index) => String(index + firstSuffix));
  return [base, ...suffixes.map((suffix) => `${base.slice(0, maxLength - suffix.length)}${suffix}`)];
}

function usernameBase(providerLogin: string, provider: OAuthProvider): string {
  const cleaned = providerLogin.normalize('NFKD').replace(combiningMarks, '').replace(disallowedRuns, '_').replace(/^_+|_+$/g, '');
  if (cleaned === '') return provider;
  const padded = cleaned.length < minLength ? `${cleaned}_${provider}` : cleaned;
  return padded.slice(0, maxLength);
}
