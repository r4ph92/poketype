import { expect, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { enterAsGuest, submitTrainerName, uniqueName } from './guests';
import { passageFragments, passageSegment, timer, typingArea } from './race';
import { createRoom, newGuestPage, openRoomAsNewGuest, roomPagePath, setRoomPhase, startRaceInDatabase, testPassage } from './rooms';

type UserTexts = string[];

export type PixelPageState = { name: string; isNotFound?: boolean; prepare: (page: Page, browser: Browser) => Promise<UserTexts> };

export type OpenedState = { page: Page; userTexts: UserTexts };

const liveUpdateMs = 6_000;

async function visit(page: Page, path: string): Promise<UserTexts> {
  await page.goto(path);
  return [];
}

async function openPlay(page: Page): Promise<UserTexts> {
  const name = uniqueName('Alex ');
  await enterAsGuest(page, name);
  return [name];
}

async function openRoom(page: Page): Promise<UserTexts> {
  const name = uniqueName('Alex ');
  await openRoomAsNewGuest(page, name);
  return [name];
}

async function openWaitingRoomWithTwoPlayers(page: Page, browser: Browser): Promise<UserTexts> {
  const [host, guestName] = [uniqueName('Alex '), uniqueName('Zoe ')];
  const roomId = await openRoomAsNewGuest(page, host);
  const guest = await newGuestPage(browser, guestName);
  await guest.goto(roomPagePath(roomId));
  await guest.context().close();
  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(2, { timeout: liveUpdateMs });
  return [host, guestName];
}

async function openWaitingRoomAsGuest(page: Page, browser: Browser): Promise<UserTexts> {
  const [hostName, guestName] = [uniqueName('Alex '), uniqueName('Zoe ')];
  const host = await newGuestPage(browser, hostName);
  const roomId = await createRoom(host);
  await host.context().close();
  await enterAsGuest(page, guestName);
  await page.goto(roomPagePath(roomId));
  await expect(page.getByText(fr.Room.hostWillStart)).toBeVisible();
  return [hostName, guestName];
}

async function openRaceCountdown(page: Page): Promise<UserTexts> {
  const name = uniqueName('Alex ');
  const roomId = await openRoomAsNewGuest(page, name);
  await startRaceInDatabase(roomId, 60_000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Room.raceHeading);
  return [name, ...passageFragments(testPassage)];
}

async function openTypingRace(page: Page, typed: string): Promise<UserTexts> {
  const name = uniqueName('Alex ');
  const roomId = await openRoomAsNewGuest(page, name);
  await startRaceInDatabase(roomId, 2_500);
  await expect(timer(page)).toHaveText(fr.Room.go, { timeout: 8_000 });
  await expect(typingArea(page)).toBeFocused();
  await page.keyboard.type(typed, { delay: 80 });
  return [name, ...passageFragments(testPassage)];
}

async function openTypingWithMistake(page: Page): Promise<UserTexts> {
  const userTexts = await openTypingRace(page, `${testPassage.slice(0, 4)}#`);
  await expect(passageSegment(page, 'rejected')).toBeVisible();
  return userTexts;
}

async function openStartedRace(page: Page, browser: Browser): Promise<UserTexts> {
  const host = await newGuestPage(browser, uniqueName('Alex '));
  const roomId = await createRoom(host);
  await setRoomPhase(roomId, 'racing');
  await host.context().close();
  await enterAsGuest(page, uniqueName('Zoe '));
  await page.goto(roomPagePath(roomId));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.Room.raceStartedHeading);
  return [];
}

async function openPageError(page: Page): Promise<UserTexts> {
  await page.route('/', (route) => (route.request().method() === 'POST' ? route.fulfill({ status: 403, body: '' }) : route.continue()));
  await submitTrainerName(page, uniqueName('Err '));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.ServerError.heading);
  return [];
}

async function openValidationError(page: Page): Promise<UserTexts> {
  await submitTrainerName(page, 'A');
  await expect(page.locator('#trainer-name-error')).toBeVisible();
  return [];
}

async function openPendingEntry(page: Page): Promise<UserTexts> {
  await page.route('/', (route) => (route.request().method() === 'POST' ? new Promise<void>(() => undefined) : route.continue()));
  await submitTrainerName(page, uniqueName('Wait '));
  await expect(page.getByRole('button', { name: fr.GuestEntry.submit })).toHaveAttribute('aria-disabled', 'true');
  return [];
}

async function openReconnectingRoom(page: Page): Promise<UserTexts> {
  const userTexts = await openRoom(page);
  await page.context().setOffline(true);
  await expect(page.getByText(fr.Room.reconnecting)).toBeVisible({ timeout: liveUpdateMs });
  return userTexts;
}

async function openGoneRoom(page: Page): Promise<UserTexts> {
  const roomId = await openRoomAsNewGuest(page, uniqueName('Alex '));
  await setRoomPhase(roomId, 'closed');
  await expect(page.getByRole('heading', { name: fr.Room.gone })).toBeFocused({ timeout: liveUpdateMs });
  return [];
}

async function openCopiedLink(page: Page): Promise<UserTexts> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const userTexts = await openRoom(page);
  await page.getByRole('button', { name: fr.Room.copyLink }).click();
  await expect(page.getByRole('status')).toHaveText(fr.Room.copied);
  return userTexts;
}

async function openSignUpErrors(page: Page): Promise<UserTexts> {
  await page.goto('/signup');
  await page.getByRole('button', { name: fr.SignUp.submit }).click();
  await expect(page.locator('#signup-username-error')).toBeVisible();
  return [];
}

async function focusSkipLink(page: Page): Promise<UserTexts> {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: fr.Header.skipToContent })).toBeFocused();
  return [];
}

export const pageStates: PixelPageState[] = [
  { name: 'home', prepare: (page) => visit(page, '/') },
  { name: 'play', prepare: openPlay },
  { name: 'waiting-room', prepare: openWaitingRoomWithTwoPlayers },
  { name: 'sign-up', prepare: (page) => visit(page, '/signup') },
  { name: 'unknown-address', isNotFound: true, prepare: (page) => visit(page, '/nimporte-quoi') },
  { name: 'unknown-api-address', isNotFound: true, prepare: (page) => visit(page, '/api/inexistante') },
  { name: 'room-not-found', isNotFound: true, prepare: (page) => visit(page, '/rooms/not-a-room') },
  { name: 'race', prepare: openRaceCountdown },
  { name: 'race-typing', prepare: (page) => openTypingRace(page, testPassage.slice(0, 6)) },
  { name: 'race-started', prepare: openStartedRace },
  { name: 'page-error', prepare: openPageError },
];

export const extraStates: PixelPageState[] = [
  { name: 'home-validation-error', prepare: openValidationError },
  { name: 'home-pending', prepare: openPendingEntry },
  { name: 'sign-up-validation-errors', prepare: openSignUpErrors },
  { name: 'race-typing-mistake', prepare: openTypingWithMistake },
  { name: 'waiting-room-as-guest', prepare: openWaitingRoomAsGuest },
  { name: 'waiting-room-reconnecting', prepare: openReconnectingRoom },
  { name: 'waiting-room-gone', prepare: openGoneRoom },
  { name: 'waiting-room-link-copied', prepare: openCopiedLink },
  { name: 'skip-link-focused', prepare: focusSkipLink },
];

export async function openState(browser: Browser, state: PixelPageState, options: BrowserContextOptions = {}): Promise<OpenedState> {
  const page = await (await browser.newContext(options)).newPage();
  return { page, userTexts: await state.prepare(page, browser) };
}
