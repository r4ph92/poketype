import type { Page } from '@playwright/test';
import { typingArea } from './race';

type CompositionHarnessWindow = Window & { rejectedEverShown: boolean };

// A dead key or a macOS Option combination as Chromium's input method layer delivers it: the accent sits in the field as composition
// text, then the next key commits the composed letter (compositionstart, insertCompositionText, compositionend).
export async function typeThroughComposition(page: Page, accent: string, committed: string): Promise<void> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.imeSetComposition', { text: accent, selectionStart: accent.length, selectionEnd: accent.length });
    await session.send('Input.insertText', { text: committed });
  } finally {
    await session.detach();
  }
}

// A dead key whose composition is still open, as when the accent key was pressed but not the letter yet.
export async function pressDeadKey(page: Page, accent: string): Promise<void> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.imeSetComposition', { text: accent, selectionStart: accent.length, selectionEnd: accent.length });
  } finally {
    await session.detach();
  }
}

export async function commitOpenComposition(page: Page, committed: string): Promise<void> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.insertText', { text: committed });
  } finally {
    await session.detach();
  }
}

// Chromium cannot produce Safari's order, where the committed text is inserted again after compositionend, so it is dispatched by hand.
export async function dispatchSafariComposition(page: Page, accent: string, committed: string): Promise<void> {
  await typingArea(page).evaluate(
    (field, { accent, committed }) => {
      const composing = { bubbles: true, isComposing: true };
      field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
      field.dispatchEvent(new InputEvent('beforeinput', { ...composing, inputType: 'insertCompositionText', data: accent }));
      field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: committed }));
      field.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertFromComposition', data: committed }));
      field.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: committed }));
      field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: committed }));
    },
    { accent, committed },
  );
}

// Remembers whether any passage character is marked wrong from now on, even for a single frame.
export async function watchRejectedMarks(page: Page): Promise<void> {
  await page.evaluate(() => {
    const harness = window as unknown as CompositionHarnessWindow;
    harness.rejectedEverShown = false;
    new MutationObserver(() => {
      if (document.querySelector('[data-state="rejected"]')) harness.rejectedEverShown = true;
    }).observe(document, { subtree: true, childList: true, attributes: true });
  });
}

export async function readRejectedEverShown(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as CompositionHarnessWindow).rejectedEverShown);
}
