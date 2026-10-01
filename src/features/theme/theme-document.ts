import { isThemeChoice, themeStorageKey, type ThemeChoice } from './theme-choice';

// The attribute on <html> is the live source of truth, so the switch works for the visit even when storage is blocked.
export function currentTheme(): ThemeChoice {
  const attribute = document.documentElement.dataset.theme;
  return attribute === 'light' || attribute === 'dark' ? attribute : 'system';
}

export function applyTheme(choice: ThemeChoice): void {
  if (choice === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
}

export function rememberTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') localStorage.removeItem(themeStorageKey);
    else localStorage.setItem(themeStorageKey, choice);
  } catch {
    // Blocked storage only costs persistence; the choice still applies to this visit.
  }
}

export function followThemeChangesFromOtherTabs(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== themeStorageKey) return;
    applyTheme(isThemeChoice(event.newValue) ? event.newValue : 'system');
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

export function subscribeToThemeAttribute(onChange: () => void): () => void {
  const stopFollowingTabs = followThemeChangesFromOtherTabs();
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => {
    observer.disconnect();
    stopFollowingTabs();
  };
}
