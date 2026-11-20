import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuestId } from '../../src/domain/guest-id';
import type { SessionIdentity } from '../../src/server/sessions/session-store';
import { initialDisplayNameState } from '../../src/features/profile/display-name-state';

const mocks = vi.hoisted(() => ({ findCurrentSession: vi.fn(), renameTrainer: vi.fn() }));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../../src/server/db/client', () => ({ database: {} }));
vi.mock('../../src/server/sessions/current-session', () => ({ findCurrentSession: mocks.findCurrentSession }));
vi.mock('../../src/server/accounts/rename-trainer', () => ({ renameTrainer: mocks.renameTrainer }));

const { changeDisplayName } = await import('../../src/features/profile/change-display-name');

const mayaGuestId = 'maya-guest' as GuestId;
const maya: SessionIdentity = { guest: { id: mayaGuestId, trainerName: 'Maya' }, account: { id: 'maya-user' as never, username: 'Maya' } };
const zoeTheGuest: SessionIdentity = { guest: { id: 'zoe-guest' as GuestId, trainerName: 'Zoe' }, account: null };

function formWith(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}

describe('changeDisplayName', () => {
  beforeEach(() => {
    mocks.findCurrentSession.mockReset();
    mocks.renameTrainer.mockReset();
  });

  it('renames the guest identity of the signed-in session', async () => {
    mocks.findCurrentSession.mockResolvedValue(maya);
    const state = await changeDisplayName(initialDisplayNameState, formWith({ displayName: '  Maya la Rapide ' }));
    expect(mocks.renameTrainer).toHaveBeenCalledWith({}, mayaGuestId, 'Maya la Rapide');
    expect(state).toMatchObject({ error: null, saved: true, submittedName: 'Maya la Rapide' });
  });

  it('ignores a forged target and renames only the session own identity', async () => {
    mocks.findCurrentSession.mockResolvedValue(maya);
    await changeDisplayName(initialDisplayNameState, formWith({ displayName: 'Boss', guestId: 'leo-guest', userId: 'leo-user' }));
    expect(mocks.renameTrainer).toHaveBeenCalledTimes(1);
    expect(mocks.renameTrainer.mock.calls[0]?.[1]).toBe(mayaGuestId);
  });

  it.each(['Mi', 'a'.repeat(21)])('refuses %s with the length error and changes nothing', async (name) => {
    mocks.findCurrentSession.mockResolvedValue(maya);
    const state = await changeDisplayName(initialDisplayNameState, formWith({ displayName: name }));
    expect(state).toMatchObject({ error: 'length', saved: false, submittedName: name });
    expect(mocks.renameTrainer).not.toHaveBeenCalled();
  });

  it('refuses markup as characters', async () => {
    mocks.findCurrentSession.mockResolvedValue(maya);
    const state = await changeDisplayName(initialDisplayNameState, formWith({ displayName: '<b>Maya</b>' }));
    expect(state.error).toBe('characters');
    expect(mocks.renameTrainer).not.toHaveBeenCalled();
  });

  it('refuses a request without the field', async () => {
    mocks.findCurrentSession.mockResolvedValue(maya);
    const state = await changeDisplayName(initialDisplayNameState, formWith({}));
    expect(state.error).toBe('required');
    expect(mocks.renameTrainer).not.toHaveBeenCalled();
  });

  it.each([null, zoeTheGuest])('refuses a visitor or a guest', async (session) => {
    mocks.findCurrentSession.mockResolvedValue(session);
    const state = await changeDisplayName(initialDisplayNameState, formWith({ displayName: 'Valid name' }));
    expect(state.saved).toBe(false);
    expect(mocks.renameTrainer).not.toHaveBeenCalled();
  });

  it('counts each attempt so a repeated error is announced again', async () => {
    mocks.findCurrentSession.mockResolvedValue(maya);
    const first = await changeDisplayName(initialDisplayNameState, formWith({ displayName: 'x' }));
    const second = await changeDisplayName(first, formWith({ displayName: 'x' }));
    expect(second.attempt).toBe(2);
  });
});
