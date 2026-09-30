# PokéType design direction

The implementable version of the approved retro handheld-game look. The five mockups and per-screen notes in [design/README.md](design/README.md) set the mood and the screen content; this file sets the rules. When the two disagree, this file wins. The modern rounded-card direction was rejected; do not reintroduce it.

**Intent:** a handheld Pokémon game menu that 10–12 year olds can read, tab through and type in: cream dialogue panels with stepped navy frames sitting on a sage world, gold marking "this one", and a calm, very legible typing passage.

## Signature moves

Apply these on every screen. A reviewer checks them one by one.

1. **Panels on sage.** Every content region is a `PixelPanel` (cream paper, 4px notched ink frame, 4px gap, 2px slate inner line) floating on the sage canvas with 16px gutters. Panels never touch each other and never nest a second full frame.
2. **Gold means "this one".** Gold fill is used only for the current or selected thing: the current tab, the active racer, the YOU row, a pressed toggle, the next character to type. It always comes with a text or shape marker (`▶`, `✓`, "VOUS", "ACTIF"). Gold is never decoration and never a plain button.
3. **One ink primary per view.** The single primary action is an ink-filled `PixelButton` with an uppercase pixel label and a trailing `▶`. Everything else is a cream secondary button or a text link.
4. **Pixel type names things, mono type is read.** Titles, buttons, tabs, badges and big numbers use the pixel face in uppercase. Body text, table data, dialogue and the typing passage use the mono face.
5. **The guide speaks.** Status, guidance, empty states, validation summaries and confirmations appear in a `DialogueBox` with a portrait. No toasts, no coloured banners, no alert cards.
6. **No curves, no blur.** Zero radius, zero box shadows for elevation, zero gradients, zero translucency. States change by a tone step or an instant swap.

## Color tokens

Five names already exist in `src/app/globals.css` (`ink`, `cream`, `sage`, `gold`, `error`). They are kept and treated as **roles named after their light-theme color**: `ink` is the text and outline color, `cream` is panel paper, `sage` is the page canvas. In dark mode, `ink` becomes a light cream and `cream` becomes a deep navy. Because the pair swaps, `bg-ink text-cream` (the primary button) still works in both themes. Components never use `dark:` color utilities; the tokens carry the theme.

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `ink` | Body text, headings, focus outline, primary button fill | `#102344` | `#F3ECD2` |
| `cream` | Panel paper, text on the primary button | `#F6F0D8` | `#15223C` |
| `cream-deep` | Sunk wells: inputs, table header, hover fill, stat cells, XP track | `#E9E0BF` | `#1E2E4E` |
| `sage` | Page canvas behind the panels, footer | `#83AF84` | `#133129` |
| `frame` | 4px outer frame of panels, buttons, slots | `#102344` | `#9AAED6` |
| `slate` | 2px inner frame line, rules inside panels (decorative) | `#5B6C8F` | `#5A6FA0` |
| `muted` | Secondary text: labels, meta, disabled labels | `#46557A` | `#B3BDD3` |
| `gold` | Selected or current fill | `#F2CE58` | `#F2CE58` |
| `on-gold` | Text and icons on gold, silver and bronze fills (fixed navy) | `#102344` | `#102344` |
| `success` | Typed-correct characters, READY, positive deltas | `#25683F` | `#7FD39C` |
| `error` | Errors, wrong characters, destructive actions | `#A3343A` | `#FF9696` |
| `error-soft` | Background behind a wrong character or an error field | `#F7DAD4` | `#4B2230` |
| `xp` | XP bar fill | `#2F6BD1` | `#5EA2FF` |
| `silver` | 2nd-place medal and podium step | `#C3CAD6` | `#C3CAD6` |
| `bronze` | 3rd-place medal and podium step | `#D08A52` | `#D08A52` |

Changes from the current `@theme`: `error` moves from `#B43B41` to `#A3343A` because `#B43B41` fails on `cream-deep` (4.36:1) and on `error-soft` (4.37:1). `success` is `#25683F` instead of the README's `#2D774F`, which fails on `cream-deep` (4.11:1). All other names are new.

### Measured contrast (WCAG 2.x relative luminance)

Text needs 4.5:1; large text, frames of controls, focus indicators and meaningful graphics need 3:1.

| Foreground on background | Use | Light | Dark |
| --- | --- | --- | --- |
| `ink` on `cream` | body text, focus outline on panels | 13.65 | 13.38 |
| `ink` on `cream-deep` | input text, table header | 11.80 | 11.40 |
| `ink` on `sage` | footer text, focus outline on the canvas | 6.26 | 11.83 |
| `muted` on `cream` | labels, meta | 6.47 | 8.40 |
| `muted` on `cream-deep` | placeholder, disabled label | 5.59 | 7.16 |
| `success` on `cream` | typed-correct passage text | 5.87 | 8.82 |
| `success` on `cream-deep` | READY chip in a well | 5.07 | 7.52 |
| `error` on `cream` | field error message | 5.91 | 7.58 |
| `error` on `cream-deep` | error inside a well | 5.11 | 6.46 |
| `error` on `error-soft` | wrong character in the passage | 5.12 | 6.40 |
| `on-gold` on `gold` | selected tab, YOU row, next character | 10.21 | 10.21 |
| `cream` on `ink` | primary button label | 13.65 | 13.38 |
| `on-gold` on `silver` / `bronze` | medal numerals | 9.47 / 5.53 | 9.47 / 5.53 |
| `frame` on `cream` / `sage` / `cream-deep` | control boundaries | 13.65 / 6.26 / 11.80 | 7.09 / 6.27 / 6.04 |
| `xp` on `cream-deep` | XP fill against its track | 3.83 | 5.20 |
| `slate` on `cream` | inner line (decorative, not relied on) | 4.61 | 3.18 |

Forbidden pairs:

| Pair | Ratio | Rule |
| --- | --- | --- |
| `muted`, `error` or `success` text on `sage` | 2.97 / 2.71 / 2.69 in light | Only `ink` text on the sage canvas. |
| `ink` on `gold` | 1.29 in dark | Text on gold is always `text-on-gold`. |
| `gold` on `cream` | 1.34 | Gold never stands alone as a boundary; a gold fill always sits inside a `frame` border. |

No focusable control sits inside a gold fill: gold marks the control itself, and its focus outline falls on the surrounding paper.

### Theme mechanism

`light-dark()` keeps each light and dark pair on one line. With no attribute the page follows the system; the profile preference writes `data-theme` on `<html>` server-side from a cookie, so there is no flash.

```css
@theme {
  --color-*: initial;
  --color-ink: light-dark(#102344, #f3ecd2);
  --color-cream: light-dark(#f6f0d8, #15223c);
  --color-cream-deep: light-dark(#e9e0bf, #1e2e4e);
  --color-sage: light-dark(#83af84, #133129);
  --color-frame: light-dark(#102344, #9aaed6);
  --color-slate: light-dark(#5b6c8f, #5a6fa0);
  --color-muted: light-dark(#46557a, #b3bdd3);
  --color-gold: #f2ce58;
  --color-on-gold: #102344;
  --color-success: light-dark(#25683f, #7fd39c);
  --color-error: light-dark(#a3343a, #ff9696);
  --color-error-soft: light-dark(#f7dad4, #4b2230);
  --color-xp: light-dark(#2f6bd1, #5ea2ff);
  --color-silver: #c3cad6;
  --color-bronze: #d08a52;
  --radius-*: initial;
  --shadow-*: initial;
}

@layer base {
  :root { color-scheme: light dark; }
  :root[data-theme='light'] { color-scheme: light; }
  :root[data-theme='dark'] { color-scheme: dark; }
}
```

`--color-*: initial` removes Tailwind's default palette. Migration for #21: `GuestNameForm` uses `bg-white` on its input (becomes `bg-cream-deep`) and `bg-gold` on its submit button (becomes the ink primary `PixelButton`). Verify both themes in Playwright (`colorScheme: 'dark'` and `data-theme`). If the build ever mangles `light-dark()`, fall back to a `:root[data-theme='dark']` override block plus the same values in `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }`.

## Typography

| Role | Family | next/font import | License | French glyphs |
| --- | --- | --- | --- | --- |
| Pixel: headings, buttons, tabs, badges, big numbers, wordmark | **Pixelify Sans** (variable, weight 400–700) | `Pixelify_Sans` | OFL | Verified: é è ê ë à â ç ù û ü î ï ô œ æ, capitals, « » ’ – — … |
| Mono: body, data, dialogue, typing passage | **Atkinson Hyperlegible Mono** (variable, weight 200–800) | `Atkinson_Hyperlegible_Mono` | OFL | Verified, same set |

Both families are in Next's `font-data.json`. The glyphs were checked in the full TTF files and in the `latin` subset file Google serves, so `subsets: ['latin']` covers French (the latin subset includes U+0152–0153 for Œ and œ).

**Why Pixelify Sans:** its letters are proportional, so French labels ("CHANGER DE POKÉMON", "RETOUR AU SALON") fit at 375px. Press Start 2P was rejected: every glyph is 1em wide, lowercase is hard to read at small sizes, and French strings overflow.

**Why Atkinson Hyperlegible Mono:** the Braille Institute designed it for low-vision reading, so I/l/1 and O/0 are clearly different, which matters for children copying text exactly. Monospace digits also line up WPM and accuracy columns without extra settings.

```tsx
// src/app/layout.tsx: put the variable classes on <html> so the CSS variables exist at :root
const pixelFont = Pixelify_Sans({ subsets: ['latin'], variable: '--font-pixelify', display: 'swap' });
const monoFont = Atkinson_Hyperlegible_Mono({ subsets: ['latin'], variable: '--font-atkinson-mono', display: 'swap' });
// <html lang={locale} className={`${pixelFont.variable} ${monoFont.variable}`}>  <body className="font-mono ...">
```

```css
@theme inline {
  --font-pixel: var(--font-pixelify), ui-monospace, monospace;
  --font-mono: var(--font-atkinson-mono), ui-monospace, monospace;
}
@theme {
  --text-*: initial;
  --text-sm: 0.875rem;       --text-sm--line-height: 1.45;
  --text-base: 1rem;         --text-base--line-height: 1.5;
  --text-lg: 1.25rem;        --text-lg--line-height: 1.3;
  --text-xl: 1.75rem;        --text-xl--line-height: 1.2;
  --text-display: 2.5rem;    --text-display--line-height: 1.1;
  --text-passage: 1.75rem;   --text-passage--line-height: 1.7;
}
```

| Token | Size | Face and weight | Use |
| --- | --- | --- | --- |
| `text-display` | 40px | pixel 700 | Results place ("2e place"), countdown numerals, podium numbers |
| `text-xl` | 28px | pixel 700 | Page `h1`, wordmark, big stat values |
| `text-lg` | 20px | pixel 700, uppercase, `tracking-[0.06em]` | Panel titles (`h2`) |
| `text-base` | 16px | mono 400 for body; pixel 600, uppercase, `tracking-[0.06em]` for buttons and tabs | Body, buttons, tabs |
| `text-sm` | 14px | mono 400; pixel 600 for badges | Meta, stat labels, table data, chips, footer |
| `text-passage` | 28px | mono 500 | The race passage only |

Rules:

- Nothing is smaller than 14px (the audience is 10–12 years old). Use at most four sizes per screen.
- Write message strings in sentence case and apply `uppercase` in CSS. Screen readers then read words, not letters, and French keeps its accented capitals (é becomes É).
- Numbers that are compared (WPM, accuracy, XP, ranks) are mono. French ordinals come from ICU `selectordinal` (1er, 2e, 3e); never hard-code "2nd".
- Line length for prose is at most 65ch.

## Spacing, frames and pixels

- **Spacing:** Tailwind's 4px base (`--spacing: 0.25rem`). Per screen use three steps: 8px inside a group (`gap-2`), 16px between panels and groups (`gap-4`, the sage gutter), 24px panel padding from `md` up (`p-6`, `p-4` below). Page margin is 16px on mobile.
- **Frame widths are in px, never rem**, so they stay on whole pixels at any font size: 4px outer frame, 4px gap, 2px inner line, 2px rules.
- **Corners are notched, never rounded.** The notch is a 4px square cut from each corner with `clip-path`; the fill's corner then touches the frame diagonally, which gives the stepped look in the mockups.

```css
@utility pixel-notch {
  --notch: 4px;
  clip-path: polygon(
    0 var(--notch), var(--notch) var(--notch), var(--notch) 0,
    calc(100% - var(--notch)) 0, calc(100% - var(--notch)) var(--notch), 100% var(--notch),
    100% calc(100% - var(--notch)), calc(100% - var(--notch)) calc(100% - var(--notch)),
    calc(100% - var(--notch)) 100%, var(--notch) 100%, var(--notch) calc(100% - var(--notch)),
    0 calc(100% - var(--notch))
  );
}

/* Panel: 4px outer frame, 4px paper gap, 2px slate inner line. */
@utility pixel-frame {
  border: 4px solid var(--color-frame);
  background-color: var(--color-cream);
  box-shadow: inset 0 0 0 4px var(--color-cream), inset 0 0 0 6px var(--color-slate);
}

/* Small controls and slots: 2px frame, 2px notch. */
@utility pixel-frame-thin {
  --notch: 2px;
  border: 2px solid var(--color-frame);
}

@utility pixelated {
  image-rendering: pixelated;
}
```

`box-shadow` here draws inner lines only; it is not elevation. Use `pixel-frame pixel-notch` on the panel element.

**`clip-path` gotchas.** It clips everything outside the shape, including the element's own focus outline and any child that overflows it.
- Never put `pixel-notch` on a focusable element. `PixelButton`, tab and slot components render a plain `<button>` or `<a>` and draw the notched frame on an inner `<span>`, so the outline around the real control is never clipped.
- Menus, popovers and dialogs inside a panel use native `<dialog>` or the `popover` attribute. The top layer is not clipped by an ancestor's `clip-path`.
- Panel padding is at least 16px, so a child's focus outline (2px offset plus 2px width) stays inside the clip.

**Sprites and pixel art.**
- Render every sprite at a whole-number multiple of its source size (1x, 2x or 3x), with `pixelated` and explicit `width` and `height` to reserve space. Never size sprites with `%`, `rem` or `object-fit` scaling.
- The route map chooses its scale in code: the largest whole number that fits the column (`Math.floor(columnWidth / sourceWidth)`, minimum 1), centered on the sage canvas.
- Use `next/image` with `unoptimized` for sprites. The default optimizer resamples and re-encodes, which blurs pixel art.
- Uploaded profile photos are not pixel art: show them inside a `pixel-frame-thin` without `pixelated`.
- Fractional device pixel ratios (125%, 150%) make whole-pixel scaling slightly uneven. `pixelated` keeps the edges sharp, and that is acceptable.

## Layout and shared header

One header on every page, including the race. It is a single `pixel-frame` strip on sage, not sticky.

| Slot | Content |
| --- | --- |
| Skip link | First focusable element, "Aller au contenu", targets `<main id="content">` |
| Left | Wordmark "POKÉTYPE" in `text-xl` pixel 700 `ink`, linking to the trainer dashboard, with an optional original 16px ball icon (`aria-hidden`) |
| Center | `PixelTabs` as `<nav aria-label>`: Dresseur / Course / Collection / Routes (Trainer / Race / Collection / Routes), each with a 24px pixel icon |
| Right | Trainer chip: `TrainerAvatar` (32px), name, and a menu button that opens a popover with profile, theme (clair / sombre / système), interface language, and "Changer de dresseur" |

- The race's live figures (route, rank, WPM, accuracy) live in the race's RACE STATUS panel, not in the header. That keeps the header identical on every page.
- Below 480px the header stacks: wordmark and trainer chip on the first row, tabs as a 2×2 grid under them. From 480px the four tabs sit in one row.
- The footer stays on `sage` with `ink` text (6.26:1), showing both languages as it does today.

| Screen | Desktop (`lg`, 1024px and up) | Below `lg` |
| --- | --- | --- |
| Race | Grid `[minmax(0,1fr)_20rem]`: map scene panel on top-left, typing panel under it, status / leaderboard / racer panels in the right column. The typing panel stays visible without scrolling at 1024×768. | Not supported (H8, provisional). Show a `DialogueBox`: "La course se joue sur un ordinateur avec un clavier", plus a link back to the lobby. |
| Dashboard | Two columns: scene with the primary "Trouver une course" on the left; partner, stats and badges on the right; recent races under the scene | One column in task order: primary action, partner, stats, recent races, badges |
| Collection | Box grid (5 columns) next to the detail panel | Grid of 3 columns at 375px; detail stacks under the grid and scrolls into view on selection |
| Lobby | World scene with the roster strip, and route / racer / host settings in a side column | Roster first, then settings, then route preview; the scene shrinks or hides because it is decorative |
| Results | Podium and standings on the left, performance / XP / encounter on the right, action bar underneath | Stacked in that order; the action bar wraps |

The page container is `mx-auto max-w-[90rem] px-4`. Framing the game screen on sage is intentional. Tables of standings may scroll sideways inside their panel on narrow screens; the page never does.

## Focus and keyboard

Keep the existing global style: `:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }`. Measured against the surface around the control, the outline is 13.65:1 on cream, 6.26:1 on sage and 11.80:1 on cream-deep (dark: 13.38 / 11.83 / 11.40). Gold was considered and rejected: gold on cream is 1.34:1.

The outline cannot be confused with a panel frame: controls have a single frame, the outline sits outside it after a 2px gap, and the panel's inner line is slate, not ink. Do not restyle focus per component. Tab order follows visual order, Escape closes popovers and dialogs and returns focus to the trigger, and every target is at least 44×44px (`min-h-11`), above WCAG's 24px, because the users are children.

## Component inventory

Suggested location: `src/components/pixel/`. Feature-specific parts live in `src/features/<feature>/`. Each component takes data and localized labels as props, and none of them hard-codes a frame or color outside the tokens.

| Component | Element and semantics | Anatomy and tokens |
| --- | --- | --- |
| `PixelPanel` | `<section aria-labelledby>` with an `h2` title | `pixel-frame pixel-notch`, `p-4 md:p-6`. Title bar: `text-lg` pixel uppercase, optional meta on the right in `text-sm` mono (for example "4 / 6 joueurs"), and a 2px `slate` rule under it. Variants: `default`; `scene`, where a map or illustration fills the inside with no padding; `well` (`bg-cream-deep`, `pixel-frame-thin`), used inside a panel for stat cells and inputs. |
| `PixelButton` | `<button>` or `<a>` (unclipped) wrapping a notched `<span>` | `primary`: `bg-ink text-cream`, 4px `frame`, inner 2px cream hairline (`inset 0 0 0 2px ink, inset 0 0 0 4px cream`), trailing `▶`, `min-h-12`. `secondary`: `bg-cream text-ink`, 4px `frame`. `danger` (leave the room, abandon): secondary style with `text-error` and a confirmation dialog. `toggle`: secondary, and gold with `✓` when `aria-pressed="true"` (READY). |
| `PixelTabs` | Site navigation: `<nav>` with links and `aria-current="page"`. In-page view switch: `role="tablist"` with arrow keys. Filters (Tous / Feu / Eau…): toggle buttons with `aria-pressed`, not tabs. | Each item is `pixel-frame-thin` on cream with a 24px icon and a `text-base` pixel uppercase label. The current item is gold with a `▶` marker. |
| `DialogueBox` | `<div role="status">` for live updates, `role="alert"` only for blocking errors, plain markup when static | Cream box with a 4px `frame` and the notch, portrait on the left (`TrainerAvatar` at 64px or the guide), `text-base` mono up to 65ch, and a `▼` "Suite" button when the text has more pages. Tones: `info`, `error` (error frame, `!` icon, `text-error` first line), `success` (`✓` icon). Text appears in full at once; no typewriter reveal. |
| `TrainerAvatar` | `<img>`, `alt=""` when the name is next to it, otherwise the trainer name | The player's chosen preset trainer (see Sprites and assets) in the header chip, dialogue portrait and scenes, always at a whole-number scale of its source, `pixelated`. Fallback: the name's initial in pixel type on `cream-deep`. Uploaded photos are not pixelated. |
| `PokemonSprite` | `<img>` via `next/image unoptimized`; `alt` is the localized species name, or `""` when the name is shown next to it | `scale: 1 \| 2 \| 3` times the source size from the asset manifest, `pixelated`. `locked` shows a silhouette (`brightness(0)` with a slate tint) plus a `?`. |
| `XpBar` | The visible text "420 / 600 XP" and "180 XP avant le niv. 15" is the source of truth; the bar is `aria-hidden` | Label "EXP" in pixel `text-sm`, track `cream-deep` in `pixel-frame-thin`, fill `xp` with 2px `cream-deep` ticks every 10%. Width comes from real XP (PROGRESSION.md), never from sample art. |
| `StatBlock` | `<dl>` with `<dt>` label and `<dd>` value | Row of cells separated by 2px `slate` rules. 24px pixel icon, value in `text-xl` pixel, label in `text-sm` mono `muted`. A missing value shows "—" with visually hidden "aucune donnée". Guest stats carry a "Cette session" label. |
| `RoomPlayer` | `<li>` in the roster `<ul>` | `TrainerAvatar`, `PokemonSprite`, name, and status chips (`ProgressBadge`). The current player's row is gold with "VOUS". |
| `Podium` | `<ol>` of up to 3 places; the full standings table follows it | Steps in `gold`, `silver` and `bronze` with `text-display` numerals in `on-gold`. Step height and numeral give the place, so color is not the only cue. With fewer valid results, show fewer steps. Tied players share one step with "ex æquo". |
| `PokemonSlot` | `<button aria-pressed>` in the PC box grid (a `<ul>` of slots) | `pixel-frame-thin` cell on `cream-deep`, sprite at 1x or 2x, level chip "Niv. 14" at the bottom. |
| `ProgressBadge` | Inline `<span>` with text | Pixel `text-sm` uppercase in `pixel-frame-thin`. Variants: rank (1er, 2e, 3e on gold / silver / bronze), ACTIF, NOUVEAU, VOUS, HÔTE `★`, PRÊT `✓` (`success`), EN ATTENTE `•••` (`muted`), DÉCONNECTÉ (`error`), PRÊT À ÉVOLUER `▲`. The word is always present. |

Forms use the same system even though no form component is listed above: labels above the field; input `bg-cream-deep text-ink`, 2px `frame`, `min-h-11`; placeholder in `muted`; errors in `text-error` linked with `aria-describedby`.

### States

| State | Buttons, tabs, slots | Panels and data components |
| --- | --- | --- |
| Default | As in the inventory | As in the inventory |
| Hover | Secondary and tabs: fill steps to `cream-deep`. Primary: the inner hairline turns `gold`. Instant, no transition. | None |
| Focus-visible | Global 2px `ink` outline, 2px offset, on the unclipped element | Same on any link or control inside |
| Active (pressed) | Inner `<span>` moves down 2px (`translate-y-0.5`) and the inner hairline disappears | None |
| Selected / current | `gold` fill, `text-on-gold`, `frame` border, plus `▶`, `✓` or a word, plus `aria-current`, `aria-pressed` or `aria-selected` | YOU row and active racer: gold with the "VOUS" or "ACTIF" badge |
| Disabled / `aria-disabled` | Prefer `aria-disabled="true"` so the control stays focusable. Fill `cream-deep`, `muted` text, `slate` frame, `cursor-not-allowed`, and a visible reason linked by `aria-describedby` (for example "Il faut au moins deux joueurs"). | Not applicable |
| Pending | `aria-busy="true"`; the label becomes the "-ing" verb ("Recherche…"); width is locked so nothing shifts; further clicks are ignored. A three-dot `steps()` animation plays only with `motion-safe:`. | Reserve the final size. Placeholder rows are flat `cream-deep` bars, and the panel has `aria-busy`. No shimmer. |
| Error | The control keeps its style; the error shows next to it or in a `DialogueBox` summary | A `DialogueBox` tone `error` inside the panel, with the cause and a retry action |
| Empty | Empty slot: dashed-feel `slate` frame on `cream-deep`, no content, not focusable | A `DialogueBox` with guidance and the next action ("Aucune course pour l'instant. Trouve une course !") |
| Locked (slot) | Silhouette with `?`, not focusable; the box shows "Espèce non capturée" on hover or in the detail view | Evolution chain: silhouette plus the lock icon and "Niv. 16" |

## Typing passage

The passage is the product. It must stay calm and readable for five minutes.

- **Type:** `text-passage` (28px) mono 500, `tracking-[0.02em]`, line height 1.7 (room for accents on capitals and for the underline markers), at most 48ch per line, left-aligned, no justification, no hyphenation, `white-space: pre-wrap`, `font-variant-ligatures: none`.
- **Surface:** a `PixelPanel` titled "Tape le texte" with the passage on `cream`, not `cream-deep`, to keep the best contrast for the three states. The passage carries `lang` set to the exercise language, which can differ from the UI locale.

| Character state | Treatment | Cue besides color |
| --- | --- | --- |
| Typed correctly | `text-success` | Everything before the caret is typed; progress is also shown as text in the status panel |
| Next (caret) | `bg-gold text-on-gold` block plus a 3px `ink` bar under the character. Steady, never blinking. | Block shape and underline bar |
| Wrong | `bg-error-soft text-error` plus a 3px `error` underline. A wrong space shows `·` so the error is visible. | Background block and underline; the error count also appears as text |
| Not yet typed | `text-ink` | After the caret |

- When wrong characters appear follows the error mode in JEU-2: blocked mode shows the expected character in the wrong state until it is corrected; free mode marks errors as that story defines (at the latest at the finish). Never shake, flash or play a sound on an error.
- Input is a real, labelled `<textarea>` or `<input>` with `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`. The per-character spans are `aria-hidden`; the plain passage text is linked with `aria-describedby`.
- Nothing moves inside or next to the typing panel. Overtake messages ("Tu as dépassé Maya") appear once in the side status panel through `role="status"`, rate-limited, never on every keystroke.
- Countdown: `text-display` numerals in a `DialogueBox` over the typing panel ("3, 2, 1, Partez !"), each announced once.

## Motion

- By default, state changes are instant swaps. When something must animate, use `steps()` timing (`--ease-pixel: steps(4, end)`) for 120–160ms. No easing curves, no fades, no parallax, no hover lift.
- Allowed, and only behind `motion-safe:`:
  - map sprites walking in 2 frames while their position tweens along the route
  - the results XP fill (at most 1.2s, stepped); on a level-up it fills, flashes gold twice, and continues
  - one podium hop
  - the wild-encounter reveal (silhouette to sprite, 400ms stepped)
  - confetti on results, at most 2s, never looping
- Reduced motion: map sprites jump to their new position, the XP bar shows its final state with the text, and there is no confetti, flash or idle animation. The profile's motion setting (later story) adds `data-motion="reduced"` on `<html>`. When it lands, replace `motion-safe:` with a custom variant that also checks that attribute.
- Nothing flashes more than three times per second. Nothing loops for more than 5 seconds without a pause control.

## Sprites and assets

The mockups are generated concept images, not assets. Do not slice them.

| Asset | Source | Size and scale |
| --- | --- | --- |
| Pokémon species sprites (front, party icons, route walkers) | Chosen by the user on 2026-09-30. Primary: [PMDCollab SpriteCollab](https://sprites.pmdcollab.org) ([GitHub](https://github.com/PMDCollab/SpriteCollab)), licensed CC BY-NC 4.0: non-commercial use with credit to each sprite's artists (from the sprite's `credits.txt`), shown on a credits page. Fallback and front/detail art: [PokéAPI sprites](https://pokeapi.github.io/sprites/#/pokemon/1) (official game sprites, no license; covered by the non-commercial educational notice in [DECISIONS.md](DECISIONS.md#legal-notice)). Self-host every file; do not hotlink. Every file gets a manifest entry with origin URL, artist or rights holder, terms, date retrieved and any modification. | Front sprites 64×64 source shown at 1x in slots and 2x in details; route and party icons 32×32 shown at 2x |
| Non-player characters (guide, rivals, room decoration) | [Pokémon Showdown trainer sprites](https://play.pokemonshowdown.com/sprites/) (official game art, covered by the educational notice), self-hosted with manifest entries. | Shown at a whole-number scale |
| Player trainer | Preset trainers from [Pokémon Showdown trainer sprites](https://play.pokemonshowdown.com/sprites/) (boys and girls, official game art covered by the educational notice), self-hosted with manifest entries. The player picks one from a gallery; before choosing, a default preset is shown. No layered or recolored trainer art. | Same scale as NPC trainers; whole-number scale only |
| Route tiles, buildings | Original pixel art, or CC0 / CC-BY tilesets with attribution in the manifest. | 16px tiles shown at a whole-number scale |
| UI icons | [pixelarticons](https://github.com/halfmage/pixelarticons) (MIT, 24px grid), inline SVG with `fill="currentColor"` and `aria-hidden`, or original 24px drawings. No emoji. | 24px, or 48px for scene props |
| Ball ornament in panel titles and the wordmark | Original drawing built from SVG `<rect>` elements with `shape-rendering="crispEdges"` | 16px |

- Keep all sprite metadata (path, source size, species id, origin, terms) in one asset manifest, created by the first sprite story.
- Mark placeholders `placeholder: true` in the manifest and never present them as final art.
- Never add an open-source license that claims to cover Pokémon assets.
- The wordmark is set in Pixelify Sans in `ink`, not imitating the official yellow-and-blue Pokémon logo lettering.

## What not to do

- No rounded corners, pill buttons, drop shadows, gradients, glass or `backdrop-blur`, and no hover lift.
- No default Tailwind colors (`bg-white`, `bg-blue-600`, `text-gray-*`). Use only the tokens above.
- No gold for decoration or ordinary buttons. No state shown by color alone.
- No `muted`, `error` or `success` text on sage, and no `ink` text on gold in dark mode.
- No pixel font for paragraphs or the passage. No mono for panel titles. Nothing under 14px.
- No toasts, snackbars or coloured alert banners. Use `DialogueBox`.
- No emoji icons, no mixed icon sets, and no blurry or fractionally scaled sprites.
- No mockup screenshots as backgrounds or as clickable images. UI text stays in the DOM.
- No sample data from the mockups (Alex, Zoe, 64 WPM, 12 / 30). Bind to real state.
- No animation near the typing passage, no blinking caret, no shake on errors.
- No `clip-path` on a focusable element, and no `outline: none` without the global replacement.
