import type { RoomCapacity } from '@/domain/room-capacity';
import type { RoomId } from '@/domain/room-id';
import type { SettingOutcome } from '../use-room-setting';

export type CapacityOutcome = SettingOutcome<'below-racers'>;

// The server reads the host from the session cookie and checks the role, the range and the seated racers itself.
export async function requestCapacity(roomId: RoomId, capacity: RoomCapacity): Promise<CapacityOutcome> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/capacity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capacity }),
      cache: 'no-store',
    });
    if (response.ok) return 'accepted';
    return response.status === 409 ? refusalOf(await response.json().catch(() => null)) : 'failed';
  } catch {
    return 'failed';
  }
}

function refusalOf(json: unknown): CapacityOutcome {
  const result = typeof json === 'object' && json !== null ? (json as { result?: unknown }).result : null;
  return result === 'below-racers' ? 'below-racers' : 'failed';
}
