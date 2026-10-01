import type { Page } from '@playwright/test';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';
import type { SettledResult } from './settlement';

type PageLocale = 'fr' | 'en';

const catalogs = { fr, en };

export const resultsTable = (page: Page) => page.getByRole('table', { name: fr.Room.resultsCaption });

// Data cells only: place, trainer name (without the "Toi" badge), WPM, score, accuracy, errors and finish time.
export async function readResultCells(page: Page): Promise<string[][]> {
  return page.locator('table tbody tr').evaluateAll((rows) =>
    rows.map((row) => {
      const cells = Array.from(row.querySelectorAll('td'), (cell) => cell.textContent ?? '');
      const name = row.querySelector('th > [data-trainer-name]')?.textContent ?? '';
      return [cells[0]!, name, ...cells.slice(1)];
    }),
  );
}

// What the table must show for the stored results, formatted the way the locale and the catalog format them.
export function expectedResultCells(results: SettledResult[], locale: PageLocale): string[][] {
  const room = catalogs[locale].Room;
  const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const seconds = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return [...results]
    .sort((first, second) => first.place! - second.place! || (first.trainerName < second.trainerName ? -1 : 1))
    .map((result) => [
      whole.format(result.place!),
      result.trainerName,
      whole.format(result.grossWpm!),
      whole.format(result.score!),
      room.progressPercent.replace('{percent}', String(Math.round(result.accuracy! * 100))),
      whole.format(result.rejectedKeystrokes),
      room.finishTime.replace('{seconds}', seconds.format(result.finishMs! / 1000)),
    ]);
}
