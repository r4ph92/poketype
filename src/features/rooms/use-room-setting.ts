'use client';

import { useEffect, useRef, useState } from 'react';
import { gameConfig } from '@/config/game';

// 'failed' covers a network error or any refusal the lobby does not name.
export type SettingOutcome<Refusal extends string> = 'accepted' | 'failed' | Refusal;

type SettingRequest<Value, Refusal extends string> = { value: Value; revision: number; outcome: SettingOutcome<Refusal> | 'pending' };

type RoomSetting<Value> = { current: Value; revision: number };

// The requested value shows while the snapshot is still the one it was made on, and a slider drag sends once after a pause.
// A refusal shows the room's value again, with the refusal for the lobby to explain.
export function useRoomSetting<Value, Refusal extends string = never>(
  { current, revision }: RoomSetting<Value>,
  send: (chosen: Value) => Promise<SettingOutcome<Refusal>>,
) {
  const [request, setRequest] = useState<SettingRequest<Value, Refusal> | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const isCurrent = request !== null && request.revision === revision;
  const refusal = isCurrent ? refusalOf(request.outcome) : null;
  const shown = isCurrent && refusal === null ? request.value : current;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function sendAndRecord(chosen: Value): Promise<void> {
    const outcome = await send(chosen);
    setRequest((pending) => (pending?.value === chosen ? { ...pending, outcome } : pending));
  }

  function change(chosen: Value): void {
    setRequest({ value: chosen, revision, outcome: 'pending' });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void sendAndRecord(chosen), gameConfig.text.settingsSendDelayMs);
  }

  return { shown, refusal, change };
}

function refusalOf<Refusal extends string>(outcome: SettingOutcome<Refusal> | 'pending'): Exclude<SettingOutcome<Refusal>, 'accepted'> | null {
  if (outcome === 'pending' || outcome === 'accepted') return null;
  return outcome as Exclude<SettingOutcome<Refusal>, 'accepted'>;
}
