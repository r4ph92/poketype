import { expect, type Page } from '@playwright/test';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';

type Catalog = { [key: string]: string | Catalog };

type VisibleText = { text: string; lang: string };

function catalogValues(catalog: Catalog): string[] {
  return Object.values(catalog).flatMap((value) => (typeof value === 'string' ? [value] : catalogValues(value)));
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pluralPattern(message: string): string | null {
  const match = /^\{\w+, plural, one \{(.+)\} other \{(.+)\}\}$/.exec(message);
  if (!match) return null;
  const branches = [match[1]!, match[2]!].map((branch) => escapeForRegExp(branch).replace('#', '\\d+'));
  return branches.join('|');
}

function catalogPattern(value: string): RegExp {
  const plural = pluralPattern(value);
  if (plural) return new RegExp(`^(${plural})$`);
  return new RegExp(`^${escapeForRegExp(value).replace(/\\\{\w+\\\}/g, '.+')}$`);
}

const frenchPatterns = catalogValues(fr).map(catalogPattern);
const englishFooterPatterns = catalogValues(en.Footer).map(catalogPattern);

async function visibleTexts(page: Page): Promise<VisibleText[]> {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts: { text: string; lang: string }[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? '';
      const element = node.parentElement;
      if (!text || !element || element.closest('script, style, template, noscript')) continue;
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (box.width === 0 || box.height === 0 || style.visibility === 'hidden') continue;
      texts.push({ text, lang: element.closest('[lang]')?.getAttribute('lang') ?? '' });
    }
    return texts;
  });
}

export async function expectEveryVisibleStringFromCatalog(page: Page, userTexts: string[] = []): Promise<void> {
  const texts = await visibleTexts(page);
  expect(texts.length).toBeGreaterThan(0);
  for (const { text, lang } of texts) {
    if (userTexts.includes(text)) continue;
    const allowed = lang === 'en' ? englishFooterPatterns : frenchPatterns;
    expect(
      allowed.some((pattern) => pattern.test(text)),
      `"${text}" (lang=${lang}) is not a catalog value`,
    ).toBe(true);
  }
}
