import type { InvitationToken } from '@/domain/invitation-token';
import { createSecretToken, hashSecretToken } from '../secret-token';

export function createInvitationToken(): InvitationToken {
  return createSecretToken() as InvitationToken;
}

export const hashInvitationToken = hashSecretToken;
