import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RoomId } from '../../src/domain/room-id';
import { fetchRoomSnapshot } from '../../src/features/rooms/live/fetch-room-snapshot';
import { roomGonePaths } from '../../src/features/rooms/live/use-live-room';

const roomId = '00000000-0000-4000-8000-000000000208' as RoomId;

function answerWith(response: Response): void {
  vi.stubGlobal('fetch', vi.fn(async () => response));
}

async function fetchOutcome() {
  return fetchRoomSnapshot(roomId, new AbortController().signal);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a member polling a room that closed', () => {
  it('is sent home with the host notice when the host closed the room', async () => {
    answerWith(Response.json({ reason: 'host-closed' }, { status: 410 }));

    const outcome = await fetchOutcome();

    expect(outcome).toEqual({ kind: 'gone', reason: 'host-closed' });
    expect(roomGonePaths['host-closed']).toBe('/play?closed=host');
  });

  it('keeps the inactivity notice for a 410 without a body', async () => {
    answerWith(new Response(null, { status: 410 }));

    expect(await fetchOutcome()).toEqual({ kind: 'gone', reason: 'idle' });
  });

  it('keeps the inactivity notice for a 410 whose body is not JSON or names another reason', async () => {
    answerWith(new Response('<html>gone</html>', { status: 410 }));
    expect(await fetchOutcome()).toEqual({ kind: 'gone', reason: 'idle' });

    answerWith(Response.json({ reason: 'removed-by-host' }, { status: 410 }));
    expect(await fetchOutcome()).toEqual({ kind: 'gone', reason: 'idle' });
  });

  it('answers a closed room it was never a member of like an unknown room', async () => {
    answerWith(new Response(null, { status: 404 }));

    expect(await fetchOutcome()).toEqual({ kind: 'gone', reason: 'closed' });
  });
});
