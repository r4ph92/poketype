// 32 random bytes in base64url: 256 bits, 43 characters without padding.
const wellFormedToken = /^[A-Za-z0-9_-]{43}$/;

export type InvitationToken = string & { readonly __brand: 'InvitationToken' };

export function parseInvitationToken(value: unknown): InvitationToken | null {
  return typeof value === 'string' && wellFormedToken.test(value) ? (value as InvitationToken) : null;
}

export function invitationPath(token: InvitationToken): string {
  return `/invite/${token}`;
}

export function invitationEntryPath(token: InvitationToken): string {
  return `/?invite=${token}`;
}
