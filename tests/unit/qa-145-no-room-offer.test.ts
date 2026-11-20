import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';

const joinAvailablePublicRoom = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }));
vi.mock('@/server/db/client', () => ({ database: {} }));
vi.mock('@/server/push/room-publisher', () => ({ announceRoomChange: vi.fn() }));
vi.mock('@/server/rooms/room-placement', () => ({ joinAvailablePublicRoom: (...args: unknown[]) => joinAvailablePublicRoom(...args) }));

const { redirectToPlacedRoom, noRoomAvailablePath } = await import('@/features/rooms/race-placement');

const guestId = '00000000-0000-4000-8000-000000000001' as Parameters<typeof redirectToPlacedRoom>[0];

describe('quick race with no room to join (#145)', () => {
  beforeEach(() => {
    joinAvailablePublicRoom.mockReset();
    redirect.mockClear();
  });

  it('sends the player to the empty state without opening a room', async () => {
    joinAvailablePublicRoom.mockResolvedValue(null);
    await expect(redirectToPlacedRoom(guestId)).rejects.toThrow(`redirect:${noRoomAvailablePath}`);
    expect(noRoomAvailablePath).toBe('/play?noRoom=1');
  });

  it('places the player in the room the search found', async () => {
    joinAvailablePublicRoom.mockResolvedValue({ roomId: '00000000-0000-4000-8000-0000000000aa', result: 'joined' });
    await expect(redirectToPlacedRoom(guestId)).rejects.toThrow('redirect:/rooms/00000000-0000-4000-8000-0000000000aa');
  });

  it('words the empty state and its offer in French and English', () => {
    expect(fr.Play.noRoomAvailable).toBe('Aucune salle disponible');
    expect(fr.Play.createPublicRoom).toBe('Créer une salle publique');
    expect(en.Play.noRoomAvailable).toBe('No room available');
    expect(en.Play.createPublicRoom).toBe('Create a public room');
  });
});
