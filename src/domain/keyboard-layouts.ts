// The keyboards the missed-keys heat map can draw (RES-03, #74). Rules: docs/keyboards.md, "Missed keys on a keyboard".
export const keyboardLayoutIds = ['canadian-french', 'canadian-multilingual', 'french-azerty', 'us-qwerty'] as const;

export type KeyboardLayoutId = (typeof keyboardLayoutIds)[number];

// characters are what the key types alone, with Shift, then with AltGr; a dead key types nothing by itself, and a filler key
// (Tab, Shift, Enter…) nothing at all, so both list none. width is in standard key widths; every row adds up to rowWidth.
export type KeyboardKey = { id: string; label: string; shiftLabel: string | null; characters: readonly string[]; width: number };

export type KeyboardLayout = { id: KeyboardLayoutId; rows: readonly (readonly KeyboardKey[])[] };

type KeyShape = Omit<KeyboardKey, 'id'>;

export const rowWidth = 15;

function letters(keys: string): KeyShape[] {
  return Array.from(keys, (letter) => ({ label: letter.toUpperCase(), shiftLabel: null, characters: [letter, letter.toUpperCase()], width: 1 }));
}

function symbol(base: string, shift: string | null, altGr?: string): KeyShape {
  const characters = [base, shift, altGr].filter((character): character is string => character !== null && character !== undefined);
  return { label: base, shiftLabel: shift, characters, width: 1 };
}

function deadKey(label: string, shiftLabel: string): KeyShape {
  return { label, shiftLabel, characters: [], width: 1 };
}

function filler(width: number): KeyShape {
  return { label: '', shiftLabel: null, characters: [], width };
}

const spaceRow: KeyShape[] = [filler(4), { label: '', shiftLabel: null, characters: [' '], width: 7 }, filler(4)];

const digits = (shifted: string): KeyShape[] => Array.from('1234567890', (digit, index) => symbol(digit, shifted[index]!));

function layout(id: KeyboardLayoutId, rows: KeyShape[][]): KeyboardLayout {
  return { id, rows: [...rows, spaceRow].map((row, rowIndex) => row.map((key, keyIndex) => ({ ...key, id: `${rowIndex}-${keyIndex}` }))) };
}

// Windows "Canadian French", the usual Quebec layout: é is a key; è à ù take the ` dead key, ê â î ô û the ^ one, ç the ¸ one.
const canadianFrench = layout('canadian-french', [
  [symbol('#', '|'), ...digits('!"/$%?&*()'), symbol('-', '_'), symbol('=', '+'), filler(2)],
  [filler(1.5), ...letters('qwertyuiop'), deadKey('^', '^'), deadKey('¸', '¨'), filler(1.5)],
  [filler(1.75), ...letters('asdfghjkl'), symbol(';', ':'), deadKey('`', '`'), symbol('<', '>'), filler(1.25)],
  [filler(1.25), symbol('«', '»'), ...letters('zxcvbnm'), symbol(',', "'"), symbol('.', null), ...letters('é'), filler(2.75)],
]);

// CSA, the Canadian multilingual standard: é è à ù ç are keys; ê â î ô û take the ^ dead key.
const canadianMultilingual = layout('canadian-multilingual', [
  [symbol('/', '\\'), ...digits('!@#$%?&*()'), symbol('-', '_'), symbol('=', '+'), filler(2)],
  [filler(1.5), ...letters('qwertyuiop'), deadKey('^', '¨'), ...letters('ç'), filler(1.5)],
  [filler(1.75), ...letters('asdfghjkl'), symbol(';', ':'), ...letters('èà'), filler(1.25)],
  [filler(1.25), ...letters('ù'), ...letters('zxcvbnm'), symbol(',', "'"), symbol('.', '"'), ...letters('é'), filler(2.75)],
]);

// French AZERTY (France): é è ç à are on the digit row and ù beside M; ê â î ô û take the ^ dead key; digits need Shift.
const frenchAzerty = layout('french-azerty', [
  [
    symbol('²', null), symbol('&', '1'), symbol('é', '2'), symbol('"', '3', '#'), symbol("'", '4'), symbol('(', '5'), symbol('-', '6'),
    symbol('è', '7'), symbol('_', '8'), symbol('ç', '9'), symbol('à', '0'), symbol(')', '°'), symbol('=', '+'), filler(2),
  ],
  [filler(1.5), ...letters('azertyuiop'), deadKey('^', '¨'), symbol('$', '£'), filler(1.5)],
  [filler(1.75), ...letters('qsdfghjklm'), symbol('ù', '%'), symbol('*', 'µ'), filler(1.25)],
  [filler(1.25), symbol('<', '>'), ...letters('wxcvbn'), symbol(',', '?'), symbol(';', '.'), symbol(':', '/'), symbol('!', '§'), filler(2.75)],
]);

// US QWERTY, also the US-International layout, whose ' ` ^ dead keys sit on the same keys.
const usQwerty = layout('us-qwerty', [
  [symbol('`', '~'), ...digits('!@#$%^&*()'), symbol('-', '_'), symbol('=', '+'), filler(2)],
  [filler(1.5), ...letters('qwertyuiop'), symbol('[', '{'), symbol(']', '}'), { ...symbol('\\', '|'), width: 1.5 }],
  [filler(1.75), ...letters('asdfghjkl'), symbol(';', ':'), symbol("'", '"'), filler(2.25)],
  [filler(2.25), ...letters('zxcvbnm'), symbol(',', '<'), symbol('.', '>'), symbol('/', '?'), filler(2.75)],
]);

export const keyboardLayouts: Readonly<Record<KeyboardLayoutId, KeyboardLayout>> = {
  'canadian-french': canadianFrench,
  'canadian-multilingual': canadianMultilingual,
  'french-azerty': frenchAzerty,
  'us-qwerty': usQwerty,
};

const combiningMarks = /\p{Mn}/gu;

// A character counts on the key that types it, a capital on its letter's key (Shift is not counted). A character that needs a dead key
// counts on its base letter's key, because the dead key alone is never a keystroke: the letter that follows it is the one judged.
// null: this keyboard cannot type it, so it shows in the list only.
export function keyForCharacter({ rows }: KeyboardLayout, character: string): KeyboardKey | null {
  const composed = character.normalize('NFC');
  const candidates = [composed, composed.toLowerCase(), baseLetterOf(composed)];
  for (const candidate of candidates) {
    const key = rows.flat().find(({ characters }) => characters.includes(candidate));
    if (key) return key;
  }
  return null;
}

function baseLetterOf(character: string): string {
  return character.normalize('NFD').replace(combiningMarks, '').toLowerCase();
}

export function isKeyboardLayoutId(value: unknown): value is KeyboardLayoutId {
  return typeof value === 'string' && (keyboardLayoutIds as readonly string[]).includes(value);
}
