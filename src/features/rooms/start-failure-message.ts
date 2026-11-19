import type { TextKind } from '@/domain/text-settings';

const impossibleTextStatus = 422;

export type StartFailureMessageKey = 'startFailed' | 'startImpossibleText' | 'textCoherentTooLong';

// A refused coherent text can only be one longer than every passage (CONF-04); the other refusal is about picked characters (CONF-07).
export function startFailureMessageKey(status: number | null, kind: TextKind): StartFailureMessageKey {
  if (status !== impossibleTextStatus) return 'startFailed';
  return kind === 'coherent' ? 'textCoherentTooLong' : 'startImpossibleText';
}
