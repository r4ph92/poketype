import { themeStorageKey } from './theme-choice';

// Runs while the HTML is parsed, so a stored choice is on <html> before the first paint. Anything but light or dark leaves the system setting in charge.
export const prePaintThemeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(themeStorageKey)});if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`;
