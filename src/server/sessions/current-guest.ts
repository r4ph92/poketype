import 'server-only';
import { cache } from 'react';
import { findCurrentSession } from './current-session';
import type { Guest } from './session-store';

export const findCurrentGuest = cache(async (): Promise<Guest | null> => {
  return (await findCurrentSession())?.guest ?? null;
});
