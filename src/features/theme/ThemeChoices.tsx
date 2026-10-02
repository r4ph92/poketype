'use client';

import { useSyncExternalStore } from 'react';
import { themeChoices, type ThemeChoice } from './theme-choice';
import { applyTheme, currentTheme, rememberTheme, subscribeToThemeAttribute } from './theme-document';

type ThemeChoicesProps = { label: string; names: Record<ThemeChoice, string> };

const faceClass =
  'pixel-frame-thin pixel-notch flex flex-1 items-center justify-center px-3 font-pixel text-base font-semibold uppercase tracking-[0.06em]';
const currentFaceClass = 'marker-check bg-gold text-on-gold';
const idleFaceClass = 'bg-cream text-ink group-hover:bg-cream-deep';

function chooseTheme(choice: ThemeChoice): void {
  applyTheme(choice);
  rememberTheme(choice);
}

export function ThemeChoices({ label, names }: ThemeChoicesProps) {
  const selected = useSyncExternalStore(subscribeToThemeAttribute, currentTheme, () => 'system' as const);
  return (
    <fieldset className="min-w-0">
      <legend className="float-left me-2 flex min-h-11 items-center font-pixel font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {themeChoices.map((choice) => (
          <button
            key={choice}
            type="button"
            data-theme-choice={choice}
            aria-pressed={choice === selected}
            onClick={() => chooseTheme(choice)}
            className="group inline-flex min-h-11 min-w-11 items-stretch"
          >
            <span className={`${faceClass} ${choice === selected ? currentFaceClass : idleFaceClass}`}>{names[choice]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
