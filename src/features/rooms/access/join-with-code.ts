'use server';

import { redirect } from 'next/navigation';
import { gameConfig } from '@/config/game';
import { roomPath } from '@/domain/room-id';
import { database } from '@/server/db/client';
import { announceRoomChange } from '@/server/push/room-publisher';
import { joinRoomByCode, type CodeJoinRefusal } from '@/server/rooms/join-room-by-code';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { initialJoinWithCodeState, isJoinWithCodeState, type JoinWithCodeState } from './join-with-code-state';

export async function joinWithCode(previousState: unknown, submitted: unknown): Promise<JoinWithCodeState> {
  if (!(submitted instanceof FormData)) return initialJoinWithCodeState;
  const previous = isJoinWithCodeState(previousState) ? previousState : initialJoinWithCodeState;
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const typedCode = submittedCode(submitted);
  const result = await joinRoomByCode(database, { typedCode, guestId: guest.id, joinedAt: new Date() });
  if (result.outcome === 'joined') announceRoomChange(result.roomId);
  if (result.outcome === 'joined' || result.outcome === 'already-member') redirect(roomPath(result.roomId));
  return refused(previous, result.outcome, typedCode);
}

// An oversized field is cut to nothing rather than normalized: it cannot be a code, and it is not echoed back.
function submittedCode(submitted: FormData): string {
  const typed = submitted.get('code');
  return typeof typed === 'string' && typed.length <= gameConfig.rooms.maxSubmittedCodeLength ? typed : '';
}

function refused(previous: JoinWithCodeState, error: CodeJoinRefusal, submittedCode: string): JoinWithCodeState {
  return { error, submittedCode, attempt: previous.attempt + 1 };
}
