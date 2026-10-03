const openCookieSettingsEvent = 'poketype:open-cookie-settings';

export function requestCookieSettings(): void {
  window.dispatchEvent(new Event(openCookieSettingsEvent));
}

export function onCookieSettingsRequested(open: () => void): () => void {
  window.addEventListener(openCookieSettingsEvent, open);
  return () => window.removeEventListener(openCookieSettingsEvent, open);
}
