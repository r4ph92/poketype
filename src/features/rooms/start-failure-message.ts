import type { TextKind } from '@/domain/text-settings';

const impossibleTextStatus = 422;

export type StartFailureMessageKey = 'startFailed' | 'startImpossibleText' | 'textCoherentTooLong';

// A refused coherent text is one longer than any passage at its level (CONF-04, CONF-05); the other refusal is about picked characters (CONF-07).
export function startFailureMessageKey(status: number | null, kind: TextKind): StartFailureMessageKey {
  if (status !== impossibleTextStatus) return 'startFailed';
  return kind === 'coherent' ? 'textCoherentTooLong' : 'startImpossibleText';
}
