import { describe, expect, it } from 'vitest';
import { botProgressAt } from '../../src/domain/bot-race';
import type { RoomMemberView } from '../../src/domain/room-view';
import { withLocalBotNames } from '../../src/features/race/bot-names';
import { withBotProgressAt } from '../../src/features/race/bot-racers';

const progress = { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 };
const player: RoomMemberView = { memberKey: 'a', trainerName: 'Alex', hasAccount: false, isHost: true, isViewer: true, partner: null, profile: null, progress, bot: null };
const brock: RoomMemberView = { memberKey: 'bot-brock', trainerName: 'Pierre', hasAccount: false, isHost: false, isViewer: false, partner: 'onix', profile: null, progress, bot: { character: 'brock', level: 'beginner', seed: 77 } };
const passage = 'Le garçon range ses crayons dans sa trousse avant la récréation.';

describe('bot names', () => {
  it('shows each bot under its official name in the interface language and leaves players alone', () => {
    expect(withLocalBotNames([player, brock], 'en').map((racer) => racer.trainerName)).toEqual(['Alex', 'Brock']);
    expect(withLocalBotNames([player, brock], 'fr').map((racer) => racer.trainerName)).toEqual(['Alex', 'Pierre']);
  });
});

describe('bot progress between snapshots', () => {
  it('moves a racing bot to where its seed puts it, as the server computes it', () => {
    const [, moved] = withBotProgressAt([player, brock], passage, 8_000);
    const expected = botProgressAt({ level: 'beginner', seed: 77 }, passage.length, 8_000);
    expect(moved!.progress).toMatchObject({ position: expected.position, finishMs: expected.finishMs });
  });

  it('keeps the snapshot before the clock is known, outside a race and for players', () => {
    expect(withBotProgressAt([player, brock], passage, null)).toEqual([player, brock]);
    const lobbyBot = { ...brock, progress: null, bot: { ...brock.bot!, seed: null } };
    expect(withBotProgressAt([player, lobbyBot], passage, 8_000)).toEqual([player, lobbyBot]);
  });

  it('types nothing during the countdown', () => {
    expect(withBotProgressAt([brock], passage, -2_000)[0]!.progress!.position).toBe(0);
  });
});
