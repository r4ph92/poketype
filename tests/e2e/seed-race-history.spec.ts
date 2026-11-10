import { expect, test } from '@playwright/test';
import fr from '../../messages/fr.json';
import { seedAccounts } from '../../scripts/seed-accounts';
import { seedDatabase } from '../../scripts/seed-database';
import { seededRaceCount } from '../../scripts/seed-race-history';
import { measureRacer } from '../../src/domain/race-results';
import { withTestDatabase } from './support/guests';
import { logInAsMaya } from './support/login';

type SeededRow = {
  raceId: string;
  roomId: string;
  language: string;
  startsAt: Date;
  username: string;
  place: number;
  position: number;
  keystrokes: number;
  rejected: number;
  elapsedMs: number;
  grossWpm: number;
  score: number;
  accuracy: number;
};

const [maya, leo] = seedAccounts;

// The global setup already ran the seed once on the test database.
async function readSeededRaces(username: string): Promise<SeededRow[]> {
  return withTestDatabase(async (sql) => {
    const rows = await sql`
      select r.id as "raceId", r.room_id as "roomId", r.text_language as language, r.starts_at as "startsAt", u.username, p.place, p.position, p.keystrokes,
        p.rejected_keystrokes as rejected, extract(epoch from p.finished_at - r.starts_at) * 1000 as "elapsedMs", p.gross_wpm as "grossWpm", p.score, p.accuracy
      from race_participants p
      join races r on r.id = p.race_id
      join users u on u.guest_id = p.guest_id
      where lower(u.username) = lower(${username}) and r.ended_at is not null and p.finished_at is not null
      order by r.starts_at`;
    return rows.map((row) => ({ ...row, elapsedMs: Math.round(Number(row.elapsedMs)) })) as unknown as SeededRow[];
  });
}

test('Maya and Leo each have twelve settled races over the last 30 days, in both languages, with varied places and scores from the live formulas', async () => {
  for (const account of [maya!, leo!]) {
    const races = await readSeededRaces(account.username);
    expect(races.length).toBeGreaterThanOrEqual(seededRaceCount);
    expect(new Set(races.map((race) => race.language))).toEqual(new Set(['fr', 'en']));
    expect(new Set(races.map((race) => race.place)).size).toBeGreaterThan(1);
    const oldest = Date.now() - races[0]!.startsAt.getTime();
    expect(oldest).toBeLessThanOrEqual(31 * 86_400_000);
    for (const race of races) {
      const metrics = measureRacer({ typedCharacters: race.position, keystrokes: race.keystrokes, rejectedKeystrokes: race.rejected, elapsedMs: race.elapsedMs });
      expect(race.grossWpm).toBeCloseTo(metrics.grossWpm, 6);
      expect(race.score).toBeCloseTo(metrics.score, 6);
      expect(race.accuracy).toBeCloseTo(metrics.accuracy, 6);
    }
  }
});

test('seeding again duplicates no race', async () => {
  const before = (await readSeededRaces(maya!.username)).length;
  await seedDatabase(process.env.TEST_DATABASE_URL!);
  expect(await readSeededRaces(maya!.username)).toHaveLength(before);
});

test('Maya sees her seeded races on the dashboard and opens one with both racers in the results', async ({ page }) => {
  const [race] = await readSeededRaces(maya!.username);
  await logInAsMaya(page);
  await expect(page.getByRole('region', { name: fr.Trainer.recentRaces, exact: true }).getByRole('row')).not.toHaveCount(0);

  await page.goto(`/rooms/${race!.roomId}/races/${race!.raceId}`);
  await expect(page.locator('main')).toContainText(maya!.username);
  await expect(page.locator('main')).toContainText(leo!.username);
});
