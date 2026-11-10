import { expect, test, type Page } from '@playwright/test';
import fr from '../../messages/fr.json';
import { logInAsMaya } from './support/login';
import { enterAsGuest, readSessionToken, sessionCookieName, submitTrainerName, uniqueName } from './support/guests';
import { en, switchInterfaceTo } from './support/locale';
import { captureCreateRoomSubmission, countRoomsHostedBy, createRoom, redirectTarget } from './support/rooms';
import { chooseStarterOnScreen, starterScreen } from './support/trainer';

async function expectHostingInvitation(page: Page, messages: typeof fr | typeof en): Promise<void> {
  const play = messages.Play;
  await expect(page.getByRole('button', { name: play.createRoom })).toHaveCount(0);
  await expect(page.getByText(play.hostWithAccount, { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: messages.AccountBar.logIn, exact: true })).toHaveAttribute('href', '/login');
  await expect(page.getByRole('main').getByRole('link', { name: messages.AccountBar.signUp, exact: true })).toHaveAttribute('href', '/signup');
}

test.describe('a guest cannot host a room', () => {
  test('the trainer hub and the Race tab invite her to log in or sign up instead of offering "Créer une salle"', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Zoe '));
    await expectHostingInvitation(page, fr);
    await page.goto('/play/race');
    await expectHostingInvitation(page, fr);
  });

  test('in English the invitation is in English on both pages', async ({ page }) => {
    await enterAsGuest(page, uniqueName('Zoe '));
    await switchInterfaceTo(page, 'en');
    await expectHostingInvitation(page, en);
    await page.goto('/play/race');
    await expectHostingInvitation(page, en);
  });

  test('posting the create-room action directly creates no room and sends her to log in', async ({ browser, request }) => {
    const capturing = await (await browser.newContext()).newPage();
    await enterAsGuest(capturing, uniqueName('Capture '));
    const captured = await captureCreateRoomSubmission(capturing);

    const guestName = uniqueName('Zoe ');
    const guest = await (await browser.newContext()).newPage();
    await enterAsGuest(guest, guestName);
    const cookie = `${sessionCookieName}=${await readSessionToken(guest.context())}`;
    const response = await request.post('/play', { headers: { ...captured.headers, cookie }, data: captured.body, maxRedirects: 0 });

    expect(redirectTarget(response)).toBe('/login');
    expect(await countRoomsHostedBy(guestName)).toBe(0);
    await capturing.context().close();
    await guest.context().close();
  });

  test('a pending "create a room" after choosing a starter ends on the log-in page without a room', async ({ page }) => {
    const guestName = uniqueName('Zoe ');
    await submitTrainerName(page, guestName);
    await expect(page).toHaveURL(starterScreen);
    await page.goto('/play/choose-starter?next=create-room%3Apublic');
    await chooseStarterOnScreen(page);

    await expect(page).toHaveURL('/login');
    expect(await countRoomsHostedBy(guestName)).toBe(0);
  });
});

test.describe('a signed-in player hosts a room', () => {
  test('Maya creates a room from the trainer hub and is its host', async ({ page }) => {
    await logInAsMaya(page);
    await expect(page.getByText(fr.Play.hostWithAccount, { exact: true })).toHaveCount(0);

    await createRoom(page);

    await expect(page.getByRole('button', { name: fr.Room.startRace })).toBeVisible();
  });
});
