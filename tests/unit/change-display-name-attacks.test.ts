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
const leoGuestId = 'leo-guest' as GuestId;
const maya: SessionIdentity = { guest: { id: mayaGuestId, trainerName: 'Maya' }, account: { id: 'maya-user' as never, username: 'Maya' } };
const leo: SessionIdentity = { guest: { id: leoGuestId, trainerName: 'Leo' }, account: { id: 'leo-user' as never, username: 'Leo' } };

function formWith(fields: [string, string][]): FormData {
  const form = new FormData();
  for (const [name, value] of fields) form.append(name, value);
  return form;
}

async function submitAsMaya(displayName: string) {
  mocks.findCurrentSession.mockResolvedValue(maya);
  return changeDisplayName(initialDisplayNameState, formWith([['displayName', displayName]]));
}

describe('changeDisplayName under hostile input', () => {
  beforeEach(() => {
    mocks.findCurrentSession.mockReset();
    mocks.renameTrainer.mockReset();
  });

  it("Leo sending Maya's guest, user and username ids renames only Leo", async () => {
    mocks.findCurrentSession.mockResolvedValue(leo);
    const forged = formWith([
      ['displayName', 'Pirate Leo'],
      ['guestId', mayaGuestId],
      ['userId', 'maya-user'],
      ['username', 'Maya'],
      ['id', mayaGuestId],
    ]);
    await changeDisplayName(initialDisplayNameState, forged);
    expect(mocks.renameTrainer).toHaveBeenCalledTimes(1);
    expect(mocks.renameTrainer).toHaveBeenCalledWith({}, leoGuestId, 'Pirate Leo');
  });

  it.each(['   ', '\t\t\t', '   '])('refuses the whitespace-only name %j as required', async (name) => {
    const state = await submitAsMaya(name);
    expect(state.error).toBe('required');
    expect(mocks.renameTrainer).not.toHaveBeenCalled();
  });

  it.each(['<script>alert(1)</script>', "Maya' OR 1=1--", 'Maya 😀', 'Ma​ya', 'Maya‮abc', '-Maya'])(
    'refuses %j as characters and changes nothing',
    async (name) => {
      const state = await submitAsMaya(name);
      expect(state.error).toBe('characters');
      expect(mocks.renameTrainer).not.toHaveBeenCalled();
    },
  );

  it.each(['a b', 'é'.repeat(21), 'a'.repeat(200_000)])('refuses a name outside 3 to 20 characters as length', async (name) => {
    const state = await submitAsMaya(name);
    expect(state.error).toBe('length');
    expect(mocks.renameTrainer).not.toHaveBeenCalled();
  });

  it('stores accents and ç composed and trimmed', async () => {
    const state = await submitAsMaya('  Zoé ça-Garçon  ');
    expect(state).toMatchObject({ error: null, saved: true, submittedName: 'Zoé ça-Garçon' });
    expect(mocks.renameTrainer).toHaveBeenCalledWith({}, mayaGuestId, 'Zoé ça-Garçon');
  });

  it('accepts exactly 20 characters', async () => {
    const state = await submitAsMaya('abcdefghijklmnopqrst');
    expect(state.saved).toBe(true);
  });
});
