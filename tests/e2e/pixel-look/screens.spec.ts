import { test } from '@playwright/test';
import { extraStates, openState, pageStates } from '../support/pixel-states';

const widths = [320, 375, 1440];

// Full-page captures for design review, written next to the test report; nothing is asserted here.
test.describe('screens for review', () => {
  for (const state of [...pageStates, ...extraStates]) {
    test(`${state.name} at ${widths.join(', ')} pixels`, async ({ browser }) => {
      for (const width of widths) {
        const { page } = await openState(browser, state, { viewport: { width, height: 900 } });
        await page.screenshot({ path: `test-results/pixel-look/${state.name}-${width}.png`, fullPage: true, animations: 'disabled' });
        await page.context().close();
      }
    });
  }
});
