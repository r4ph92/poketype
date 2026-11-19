# Text complexity (CONF-05, #152)

The host picks Facile, Moyen or Difficile (default Facile) in the waiting room. The choice applies to both text types: "Aléatoire" draws words of that level, "Cohérent" picks a passage classified at that level. Every threshold lives in `gameConfig.text.complexity` (`src/config/game.ts`); the code is `src/domain/text-complexity.ts`.

## The three criteria

Measured on any text (`measureText`). A word is a token with a letter; `l'arbre` and `tree's` count as one word.

| Criterion | Definition |
| --- | --- |
| Average word length | Letters per word (apostrophes and digits excluded). |
| Average frequency rank | Position of each word in its language's frequency list (`src/assets/word-lists/`, 1 000 words, 0 is the most frequent). A word outside the list counts as 1 000. A word with an apostrophe is ranked by its longest run of letters. |
| Share of punctuation and special characters | Characters that are not letters, among all characters that are not spaces (commas, periods, question marks, apostrophes, digits). |

## Thresholds

A value up to the easy ceiling is easy, up to the medium ceiling medium, above it hard. A text is as hard as the hardest of its three criteria (`levelOfMeasures`).

| Criterion | Facile up to | Moyen up to | Difficile |
| --- | --- | --- | --- |
| Average word length, French | 4.7 | 5.5 | above 5.5 |
| Average word length, English | 4.2 | 4.9 | above 4.9 |
| Average frequency rank | 400 | 470 | above 470 |
| Share of punctuation and special characters | 0.06 | 0.09 | above 0.09 |

French words are longer than English ones (the top 700 French words average 5.3 letters, the English ones 4.9), so the word length differs by language. The corpus passages sit between 310 and 570 in rank because rare words count as 1 000.

## Random text

`generateRaceText` draws only words of the level's range of the frequency list and of its letter length, with the level's own chances of a comma, an apostrophe, a number (per word) and a question mark (per sentence):

| Level | Ranks | Letters | Comma | Apostrophe | Number | Question |
| --- | --- | --- | --- | --- | --- | --- |
| Facile | 0 to 399 | 2 to 6 | 3 % | 3 % | 3 % | 10 % |
| Moyen | 200 to 699 | 3 to 7 | 6 % | 6 % | 5 % | 20 % |
| Difficile | 300 to 999 | 5 to 10 | 15 % | 15 % | 12 % | 30 % |

The punctuation, capitals, accents and digits switches still decide whether those characters appear. A drawn text is measured and drawn again (up to `text.textAttempts` times, shared with the include quota) until `classifyText` gives the chosen level, so every text served meets its level's thresholds whatever its length from 10 to 150 words. `tests/unit/text-complexity.test.ts` checks 40 seeds per level, language, option set and length.

Consequences for the character picks (CONF-07): a character that no word of the level holds (for instance `â` at Facile in French, or `k` and `w` at any level in French) is reported as impossible before the start, like any other unreachable pick.

## Coherent text

`passagesAtLevel` classifies each passage of the race language, whole, by the same three criteria; `pickPassage` then keeps those with at least the host's number of words. The 47 passages of `src/assets/passage-corpus.ts` come out as:

| Language | Facile | Moyen | Difficile | Passages of 100 words or more |
| --- | --- | --- | --- | --- |
| French | 4 | 6 | 13 | Moyen 1, Difficile 1 |
| English | 7 | 13 | 4 | Moyen 1, Difficile 2 |

Every level has passages in French and in English up to 60 words (Facile 3 in French and 6 in English at 60). When no passage has the chosen level, language and length (for example Facile at 100 words, "Long" preset), the race falls back to random words of the same level, as it already did when no passage was long enough: it never refuses to start and never serves a text of another level. The served text is the first words of the passage after the host's switches, so its measures can differ slightly from the whole passage's.

The older `passages.complexity` column (readability score from `measureComplexity`) is not used by the levels.

## Public list

Each public room shows its level, and a "Complexité" filter (Toutes, Facile, Moyen, Difficile) keeps one level. It is address-driven like the language filter: `?complexite=easy|medium|hard`, combinable with `?langue=`; an unknown value applies no filter.
