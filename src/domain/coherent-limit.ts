import type { ComplexityLevel } from './text-complexity';
import type { TextLanguage } from './text-settings';

// The most words a coherent text can have in each language at each complexity level (CONF-04, CONF-05): the longest first-words slice of a corpus passage that measures at the level.
// The server computes it from the corpus and hands the lobby these numbers, so the corpus never ships to the browser.
export type CoherentLimits = Readonly<Record<TextLanguage, Readonly<Record<ComplexityLevel, number>>>>;
