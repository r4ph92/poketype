import type { CodeJoinRefusal } from '@/server/rooms/join-room-by-code';

export type JoinWithCodeState = { error: CodeJoinRefusal | null; submittedCode: string; attempt: number };

export const initialJoinWithCodeState: JoinWithCodeState = { error: null, submittedCode: '', attempt: 0 };

export function isJoinWithCodeState(value: unknown): value is JoinWithCodeState {
  return typeof value === 'object' && value !== null && typeof (value as JoinWithCodeState).attempt === 'number';
}
