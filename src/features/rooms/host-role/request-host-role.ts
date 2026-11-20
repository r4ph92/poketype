import type { HostRole } from '@/domain/host-role';
import type { RoomId } from '@/domain/room-id';

export type HostRoleOutcome = 'accepted' | 'full' | 'failed';

const conflictStatus = 409;

// The server reads the host from the session cookie and checks the role and the phase itself.
export async function requestHostRole(roomId: RoomId, role: HostRole): Promise<HostRoleOutcome> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/host-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
      cache: 'no-store',
    });
    if (response.ok) return 'accepted';
    return response.status === conflictStatus && role === 'participant' ? 'full' : 'failed';
  } catch {
    return 'failed';
  }
}
