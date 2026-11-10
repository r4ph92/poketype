'use server';

import { redirect } from 'next/navigation';
import { gameConfig } from '@/config/game';
import type { GuestId } from '@/domain/guest-id';
import { roomPath } from '@/domain/room-id';
import { chooseStarterPath } from '@/domain/starter-destination';
import { database } from '@/server/db/client';
import { readClientAddressKey } from '@/server/http/client-address';
import { announceRoomChange } from '@/server/push/room-publisher';
import { findRoomForCode, joinRoomByCode, type CodeJoinRefusal } from '@/server/rooms/join-room-by-code';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { parseForm } from '@/server/validation/parse-form';
import { joinWithCodeFormSchema } from '@/server/validation/room-schemas';
import { hasStarter } from '@/server/trainer/partner';
import { initialJoinWithCodeState, isJoinWithCodeState, type JoinWithCodeState } from './join-with-code-state';

type CodeAttempt = { previous: JoinWithCodeState; typedCode: string; guestId: GuestId; addressKey: string | null };

export async function joinWithCode(previousState: unknown, submitted: unknown): Promise<JoinWithCodeState> {
  if (!(submitted instanceof FormData)) return initialJoinWithCodeState;
  const previous = isJoinWithCodeState(previousState) ? previousState : initialJoinWithCodeState;
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const form = parseForm(submitted, joinWithCodeFormSchema);
  if (!form) return refused(previous, 'unknown', '');
  const attempt = { previous, typedCode: submittedCode(form.code), guestId: guest.id, addressKey: await readClientAddressKey() };
  if (!(await hasStarter(database, guest.id))) return sendToStarterScreen(attempt);
  return joinNow(attempt);
}

async function joinNow({ previous, typedCode, guestId, addressKey }: CodeAttempt): Promise<JoinWithCodeState> {
  const result = await joinRoomByCode(database, { typedCode, guestId, addressKey, joinedAt: new Date() });
  if (result.outcome === 'joined') announceRoomChange(result.roomId);
  if (result.outcome === 'joined' || result.outcome === 'already-member') redirect(roomPath(result.roomId));
  return refused(previous, result.outcome, typedCode);
}

// The code is checked first, so a wrong code is still refused here; the room page joins once the starter is chosen.
async function sendToStarterScreen({ previous, typedCode, guestId, addressKey }: CodeAttempt): Promise<JoinWithCodeState> {
  const lookup = await findRoomForCode(database, { typedCode, guestId, addressKey });
  if (lookup.outcome === 'found') redirect(chooseStarterPath({ kind: 'room', roomId: lookup.roomId }));
  return refused(previous, lookup.outcome, typedCode);
}

// An oversized field is cut to nothing rather than normalized: it cannot be a code, and it is not echoed back.
function submittedCode(typed: string): string {
  return typed.length <= gameConfig.rooms.maxSubmittedCodeLength ? typed : '';
}

function refused(previous: JoinWithCodeState, error: CodeJoinRefusal, submittedCode: string): JoinWithCodeState {
  return { error, submittedCode, attempt: previous.attempt + 1 };
}
