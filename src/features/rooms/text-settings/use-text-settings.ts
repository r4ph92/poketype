'use client';

import { useEffect, useRef, useState } from 'react';
import { gameConfig } from '@/config/game';
import type { RoomId } from '@/domain/room-id';
import type { TextSettings } from '@/domain/text-settings';
import { requestTextSettings } from './request-text-settings';

type RoomTextSettings = { roomId: RoomId; textSettings: TextSettings; revision: number };

// Like the visibility switch, the requested settings show only while the snapshot is still the one they were made on.
type Request = { settings: TextSettings; revision: number; status: 'pending' | 'sent' | 'failed' };

// Changes are sent after a short pause, so dragging the length slider sends one request instead of one per step.
export function useTextSettings({ roomId, textSettings, revision }: RoomTextSettings) {
  const [request, setRequest] = useState<Request | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const isCurrent = request !== null && request.revision === revision;
  const shown = isCurrent && request.status !== 'failed' ? request.settings : textSettings;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function send(settings: TextSettings): Promise<void> {
    const accepted = await requestTextSettings(roomId, settings);
    setRequest((current) => (current?.settings === settings ? { ...current, status: accepted ? 'sent' : 'failed' } : current));
  }

  function change(settings: TextSettings): void {
    setRequest({ settings, revision, status: 'pending' });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void send(settings), gameConfig.text.settingsSendDelayMs);
  }

  return { shown, hasFailed: isCurrent && request.status === 'failed', change };
}
