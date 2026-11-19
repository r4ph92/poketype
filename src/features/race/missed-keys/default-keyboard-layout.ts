import type { KeyboardLayoutId } from '@/domain/keyboard-layouts';

// A French reader most likely types on a Canadian keyboard here (é is a key); an English one on a US keyboard.
export function defaultKeyboardLayout(locale: string): KeyboardLayoutId {
  return locale === 'fr' ? 'canadian-multilingual' : 'us-qwerty';
}
