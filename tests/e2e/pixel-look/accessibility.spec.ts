import { expect, test } from '@playwright/test';
import { expectNoAccessibilityViolations } from '../support/axe';
import { expectEveryVisibleStringFromCatalog } from '../support/catalog';
import { extraStates, openState, pageStates } from '../support/pixel-states';

test.describe('French pages pass WCAG 2.2 AA checks', () => {
  for (const state of [...pageStates, ...extraStates]) {
    test(`${state.name}: no axe violation and every string from the French catalog`, async ({ browser }) => {
      const { page, userTexts } = await openState(browser, state);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
      await expectNoAccessibilityViolations(page);
      await expectEveryVisibleStringFromCatalog(page, userTexts);
      await page.context().close();
    });
  }
});
