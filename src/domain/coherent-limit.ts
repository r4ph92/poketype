import type { TextLanguage } from './text-settings';

// The most words a coherent text can have in each language: the length of its longest corpus passage (CONF-04).
// The server computes it from the corpus and hands the lobby these two numbers, so the corpus never ships to the browser.
export type CoherentLimits = Readonly<Record<TextLanguage, number>>;
