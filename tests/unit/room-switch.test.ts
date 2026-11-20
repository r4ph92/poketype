import { renderToStaticMarkup } from 'react-dom/server';
import { createTranslator } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import type { GuestId } from '../../src/domain/guest-id';
import type { InvitationToken } from '../../src/domain/invitation-token';
import type { RoomId } from '../../src/domain/room-id';
import { leadsToRoom, switchRoomPath } from '../../src/domain/room-switch';
import type { CurrentRoom } from '../../src/server/rooms/current-room';

const catalogs = { fr, en } as const;
let locale: keyof typeof catalogs = 'fr';

const findActiveRoomId = vi.fn();
const findCurrentRoom = vi.fn();
const leaveRoom = vi.fn();
const announceRoomChange = vi.fn();
const continueTo = vi.fn();
const redirectToPlacedRoom = vi.fn();
const findCurrentSession = vi.fn();
const findCurrentGuest = vi.fn();
const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }));
vi.mock('next-intl/server', () => ({ getTranslations: async (namespace: string) => createTranslator({ locale, messages: catalogs[locale], namespace: namespace as never }) }));
vi.mock('@/server/db/client', () => ({ database: {} }));
vi.mock('@/server/push/room-publisher', () => ({ announceRoomChange: (...args: unknown[]) => announceRoomChange(...args) }));
vi.mock('@/server/rooms/active-membership', () => ({ findActiveRoomId: (...args: unknown[]) => findActiveRoomId(...args) }));
vi.mock('@/server/rooms/current-room', () => ({ findCurrentRoom: (...args: unknown[]) => findCurrentRoom(...args) }));
vi.mock('@/server/rooms/leave-room', () => ({ leaveRoom: (...args: unknown[]) => leaveRoom(...args) }));
vi.mock('@/server/sessions/current-session', () => ({ findCurrentSession: () => findCurrentSession() }));
vi.mock('@/server/sessions/current-guest', () => ({ findCurrentGuest: () => findCurrentGuest() }));
vi.mock('@/features/rooms/continue-to-destination', () => ({ continueTo: (...args: unknown[]) => continueTo(...args) }));
vi.mock('@/features/rooms/race-placement', () => ({ redirectToPlacedRoom: (...args: unknown[]) => redirectToPlacedRoom(...args) }));

const { switchRoom } = await import('../../src/features/rooms/switch-room/switch-room');
const { SwitchRoomOffer } = await import('../../src/features/rooms/switch-room/SwitchRoomOffer');
const { default: SwitchRoomPage } = await import('../../src/app/(site)/rooms/switch/page');
const { requireNoOtherRoom } = await import('../../src/features/rooms/one-room-gate');

const zoe = '00000000-0000-4000-8000-000000000001' as GuestId;
const mayaRoom = '00000000-0000-4000-8000-0000000000aa' as RoomId;
const otherRoom = '00000000-0000-4000-8000-0000000000bb' as RoomId;
const token = 'A'.repeat(43) as InvitationToken;

function form(next: string): FormData {
  const data = new FormData();
  data.set('next', next);
  return data;
}

function inMayaRoom(overrides: Partial<CurrentRoom> = {}): CurrentRoom {
  return { roomId: mayaRoom, hostName: 'Maya', isHost: false, isRacing: false, ...overrides };
}

async function renderOffer(current: CurrentRoom): Promise<string> {
  return renderToStaticMarkup(await SwitchRoomOffer({ current, next: 'find-race' })).replaceAll('&#x27;', "'");
}

beforeEach(() => {
  vi.clearAllMocks();
  locale = 'fr';
  findCurrentSession.mockResolvedValue({ guest: { id: zoe }, account: null });
  findCurrentGuest.mockResolvedValue({ id: zoe });
  findActiveRoomId.mockResolvedValue(mayaRoom);
  leaveRoom.mockResolvedValue('left');
});

describe('the destination the offer carries', () => {
  it('names every way into a room, and none for the hub', () => {
    expect(switchRoomPath({ kind: 'room', roomId: otherRoom })).toBe(`/rooms/switch?next=room%3A${otherRoom}`);
    expect(switchRoomPath({ kind: 'invite', token })).toBe(`/rooms/switch?next=invite%3A${token}`);
    expect(switchRoomPath({ kind: 'find-race' })).toBe('/rooms/switch?next=find-race');
    expect(switchRoomPath({ kind: 'create-room', visibility: 'unlisted', hostRole: 'participant' })).toBe('/rooms/switch?next=create-room%3Aunlisted%3Aparticipant');
    expect(switchRoomPath({ kind: 'hub' })).toBe('/rooms/switch');
  });

  it('treats reopening the current room as no switch', () => {
    expect(leadsToRoom({ kind: 'room', roomId: mayaRoom }, mayaRoom)).toBe(true);
    expect(leadsToRoom({ kind: 'room', roomId: otherRoom }, mayaRoom)).toBe(false);
    expect(leadsToRoom({ kind: 'find-race' }, mayaRoom)).toBe(false);
  });
});

describe('the offer to leave the current room', () => {
  it('asks in French by default with "Quitter et rejoindre" and "Rester", staying leading back to her room', async () => {
    const html = await renderOffer(inMayaRoom());
    expect(html).toContain('Tu es déjà dans la salle de Maya. La quitter pour rejoindre celle-ci ?');
    expect(html).toContain('Quitter et rejoindre');
    expect(html).toContain('Rester');
    expect(html).toContain(`href="/rooms/${mayaRoom}"`);
    expect(html).toContain('name="next" value="find-race"');
  });

  it('asks in English once the interface is in English', async () => {
    locale = 'en';
    const html = await renderOffer(inMayaRoom());
    expect(html).toContain("You are already in Maya's room. Leave it to join this one?");
    expect(html).toContain('Leave and join');
    expect(html).toContain('Stay');
  });

  it('warns a racer that leaving counts as abandoning, before the host warning', async () => {
    expect(await renderOffer(inMayaRoom({ isRacing: true, isHost: true }))).toContain(fr.RoomSwitch.raceWarning);
    expect(await renderOffer(inMayaRoom({ isHost: true }))).toContain(fr.Room.leaveHostMessage);
    const quiet = await renderOffer(inMayaRoom());
    expect(quiet).not.toContain(fr.RoomSwitch.raceWarning);
    expect(quiet).not.toContain(fr.Room.leaveHostMessage);
    expect(fr.RoomSwitch.raceWarning).toContain('abandon');
    expect(en.RoomSwitch.raceWarning).toContain('abandoning');
  });
});

describe('the offer page', () => {
  it('shows the offer while another room holds the player', async () => {
    findCurrentRoom.mockResolvedValue(inMayaRoom());
    const page = await SwitchRoomPage({ searchParams: Promise.resolve({ next: `room:${otherRoom}` }) });
    expect(page.props).toEqual({ current: inMayaRoom(), next: `room:${otherRoom}` });
  });

  it('goes straight on when no room holds the player any more, or when it is the same room', async () => {
    findCurrentRoom.mockResolvedValue(null);
    await expect(SwitchRoomPage({ searchParams: Promise.resolve({ next: `room:${otherRoom}` }) })).rejects.toThrow(`redirect:/rooms/${otherRoom}`);
    findCurrentRoom.mockResolvedValue(inMayaRoom());
    await expect(SwitchRoomPage({ searchParams: Promise.resolve({ next: `room:${mayaRoom}` }) })).rejects.toThrow(`redirect:/rooms/${mayaRoom}`);
  });
});

describe('"Faire une course" and creating a room', () => {
  it('offer to leave the current room before placing the player or opening a room', async () => {
    findCurrentRoom.mockResolvedValue(inMayaRoom({ isHost: true }));
    await expect(requireNoOtherRoom(zoe, { kind: 'find-race' })).rejects.toThrow('redirect:/rooms/switch?next=find-race');
    await expect(requireNoOtherRoom(zoe, { kind: 'create-room', visibility: 'public', hostRole: 'participant' })).rejects.toThrow('redirect:/rooms/switch?next=create-room%3Apublic%3Aparticipant');
  });

  it('let a player in no room carry on', async () => {
    findCurrentRoom.mockResolvedValue(null);
    await expect(requireNoOtherRoom(zoe, { kind: 'find-race' })).resolves.toBeUndefined();
  });
});

describe('"Quitter et rejoindre"', () => {
  it('leaves through the ordinary leave, tells the old room at once, then follows the destination', async () => {
    await switchRoom(form(`room:${otherRoom}`));
    expect(leaveRoom).toHaveBeenCalledWith({}, expect.objectContaining({ roomId: mayaRoom, guestId: zoe }));
    expect(announceRoomChange).toHaveBeenCalledWith(mayaRoom);
    expect(continueTo).toHaveBeenCalledWith({ kind: 'room', roomId: otherRoom }, zoe);
  });

  it('runs the quick race without sending the player back to the room she just left', async () => {
    await switchRoom(form('find-race'));
    expect(redirectToPlacedRoom).toHaveBeenCalledWith(zoe, mayaRoom);
  });

  it('leaves nothing when the destination is her own room or no room holds her', async () => {
    await switchRoom(form(`room:${mayaRoom}`));
    findActiveRoomId.mockResolvedValue(null);
    await switchRoom(form(`invite:${token}`));
    expect(leaveRoom).not.toHaveBeenCalled();
    expect(continueTo).toHaveBeenLastCalledWith({ kind: 'invite', token }, zoe);
  });

  it('announces nothing when the leave was refused', async () => {
    leaveRoom.mockResolvedValue('not-member');
    await switchRoom(form(`room:${otherRoom}`));
    expect(announceRoomChange).not.toHaveBeenCalled();
  });
});
