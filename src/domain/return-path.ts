const fallbackPath = '/';
const maxLength = 2048;
const dummyOrigin = 'http://return-path.invalid';
const controlCharacters = /[\u0000-\u001f\u007f]/;

function startsLikeLocalPath(value: string): boolean {
  return value.startsWith('/') && value[1] !== '/' && value[1] !== '\\';
}

function isPlainLocalPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > maxLength) return false;
  return startsLikeLocalPath(value) && !controlCharacters.test(value);
}

export function safeReturnPath(value: unknown): string {
  if (!isPlainLocalPath(value)) return fallbackPath;
  const url = new URL(value, dummyOrigin);
  // Dot segments can collapse "/a/..//evil" into a protocol-relative path, so the normalized result is checked again.
  const isSameOrigin = url.origin === dummyOrigin;
  return isSameOrigin && startsLikeLocalPath(url.pathname) ? url.pathname : fallbackPath;
}
