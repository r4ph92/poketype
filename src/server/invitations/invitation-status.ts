import type { CreateInvitationResult, InvitationRefusal } from './create-invitation';

export const invitationStatusByOutcome: Record<CreateInvitationResult['outcome'], number> = {
  created: 201,
  'public-room': 409,
  'too-many': 409,
  'race-started': 409,
  'not-host': 403,
  'not-member': 403,
  'not-found': 404,
};

// Only the cap names itself, so the host can be told the room holds the maximum; the other refusals mean the view is stale.
export const namedInvitationRefusals: ReadonlySet<InvitationRefusal> = new Set(['too-many']);
