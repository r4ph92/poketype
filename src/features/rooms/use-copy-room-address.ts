'use client';

import { useEffect, useState } from 'react';
import { gameConfig } from '@/config/game';

export type CopyOutcome = 'idle' | 'copied' | 'failed';

type CopyState = { outcome: CopyOutcome; roomUrl: string; copyCount: number };

const initialState: CopyState = { outcome: 'idle', roomUrl: '', copyCount: 0 };

export function useCopyRoomAddress() {
  const [state, setState] = useState<CopyState>(initialState);

  useEffect(() => {
    if (state.outcome !== 'copied') return;
    const timer = setTimeout(() => setState((current) => ({ ...current, outcome: 'idle' })), gameConfig.copyConfirmationSeconds * 1000);
    return () => clearTimeout(timer);
  }, [state.outcome, state.copyCount]);

  async function copyLink(): Promise<void> {
    const roomUrl = window.location.origin + window.location.pathname;
    const outcome = await writeToClipboard(roomUrl);
    setState((current) => ({ outcome, roomUrl, copyCount: current.copyCount + 1 }));
  }

  return { outcome: state.outcome, roomUrl: state.roomUrl, copyCount: state.copyCount, copyLink };
}

async function writeToClipboard(text: string): Promise<CopyOutcome> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
