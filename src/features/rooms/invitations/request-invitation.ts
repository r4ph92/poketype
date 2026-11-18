import { isJsonObject } from '@/domain/json-guards';
import { parseInvitationToken, type InvitationToken } from '@/domain/invitation-token';
import type { RoomId } from '@/domain/room-id';

export type CreatedInvitation = { id: string; token: InvitationToken };

export type InvitationRequestOutcome = { outcome: 'created'; invitation: CreatedInvitation } | { outcome: 'too-many' | 'failed' };

const failed: InvitationRequestOutcome = { outcome: 'failed' };

// The server reads the host from the session cookie and checks the role, the phase and the visibility itself.
export async function requestInvitation(roomId: RoomId): Promise<InvitationRequestOutcome> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/invitations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store' });
    return outcomeOf(response.status, await response.json().catch(() => null));
  } catch {
    return failed;
  }
}

export function outcomeOf(status: number, json: unknown): InvitationRequestOutcome {
  if (status === 409 && isJsonObject(json) && json.result === 'too-many') return { outcome: 'too-many' };
  const invitation = status === 201 ? parseCreatedInvitation(json) : null;
  return invitation ? { outcome: 'created', invitation } : failed;
}

function parseCreatedInvitation(json: unknown): CreatedInvitation | null {
  if (!isJsonObject(json) || typeof json.id !== 'string' || json.id.length === 0) return null;
  const token = parseInvitationToken(json.token);
  return token ? { id: json.id, token } : null;
}
