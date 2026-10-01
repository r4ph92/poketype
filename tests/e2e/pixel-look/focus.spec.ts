import { expect, test, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { contrastRatio, parseCssColor, sameColor, themeColors, type Rgb } from '../support/contrast';
import { openState, pageStates } from '../support/pixel-states';

type FocusReport = {
  label: string;
  outline: string;
  outlineColor: string;
  backdrop: string;
  isInsideClip: boolean;
  isSelfClipped: boolean;
  isBody: boolean;
};

const ink = themeColors().get('ink') as Rgb;
const maxTabStops = 40;

function describeOutline(element: HTMLElement) {
  const style = getComputedStyle(element);
  return {
    label: `${element.tagName} ${element.textContent?.trim().slice(0, 30) ?? ''}`,
    outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}`,
    outlineColor: style.outlineColor,
    isSelfClipped: style.clipPath !== 'none',
    isBody: element === document.body,
  };
}

function backdropBehind(element: HTMLElement): string {
  let node = element.parentElement;
  while (node && getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)') node = node.parentElement;
  return getComputedStyle(node ?? document.body).backgroundColor;
}

// The notch cuts 4px squares from the corners of the nearest clipped ancestor, so the outline must stay 4px inside its box.
function isOutlineInsideClip(element: HTMLElement): boolean {
  let clipper = element.parentElement;
  while (clipper && getComputedStyle(clipper).clipPath === 'none') clipper = clipper.parentElement;
  if (!clipper) return true;
  const style = getComputedStyle(element);
  const reach = Number.parseFloat(style.outlineOffset) + Number.parseFloat(style.outlineWidth) + 4;
  const box = element.getBoundingClientRect();
  const clip = clipper.getBoundingClientRect();
  return box.left - reach >= clip.left && box.top - reach >= clip.top && box.right + reach <= clip.right && box.bottom + reach <= clip.bottom;
}

async function focusReport(page: Page): Promise<FocusReport> {
  const focused = await page.evaluateHandle(() => document.activeElement as HTMLElement);
  const report = {
    ...(await focused.evaluate(describeOutline)),
    backdrop: await focused.evaluate(backdropBehind),
    isInsideClip: await focused.evaluate(isOutlineInsideClip),
  };
  await focused.dispose();
  return report;
}

// Wide pages leave no bare canvas to click, so focusing the body resets where the next Tab starts, even after a script moved focus.
async function restartTabOrder(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.removeAttribute('tabindex');
  });
}

async function tabThroughPage(page: Page): Promise<FocusReport[]> {
  await restartTabOrder(page);
  const reports: FocusReport[] = [];
  for (let stop = 0; stop < maxTabStops; stop++) {
    await page.keyboard.press('Tab');
    const report = await focusReport(page);
    if (report.isBody || (stop > 0 && report.label === reports[0]?.label)) break;
    reports.push(report);
  }
  return reports;
}

function expectVisibleFocus(report: FocusReport): void {
  expect(report.outline, report.label).toBe('solid 2px 2px');
  expect(sameColor(parseCssColor(report.outlineColor), ink), report.label).toBe(true);
  expect(contrastRatio(ink, parseCssColor(report.backdrop)), report.label).toBeGreaterThanOrEqual(3);
  expect(report.isInsideClip, `${report.label} outline is cut by a notched ancestor`).toBe(true);
  expect(report.isSelfClipped, `${report.label} is itself notched`).toBe(false);
}

test.describe('keyboard focus on every page', () => {
  for (const state of pageStates) {
    test(`${state.name}: the skip link comes first and every control shows a 3:1 ink outline`, async ({ browser }) => {
      const { page } = await openState(browser, state);
      const reports = await tabThroughPage(page);
      expect(reports[0]?.label).toBe(`A ${fr.Header.skipToContent}`);
      expect(reports.length).toBeGreaterThan(4);
      reports.forEach(expectVisibleFocus);
      await page.context().close();
    });
  }

  test('the skip link moves focus to the main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(fr.GuestEntry.label)).toBeFocused();
  });
});
