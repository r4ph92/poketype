const impossibleTextStatus = 422;

export type StartFailureMessageKey = 'startFailed' | 'startImpossibleText';

export function startFailureMessageKey(status: number | null): StartFailureMessageKey {
  return status === impossibleTextStatus ? 'startImpossibleText' : 'startFailed';
}
