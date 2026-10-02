'use client';

import { useEffect, useState } from 'react';
import { gameConfig } from '@/config/game';

export type CopyOutcome = 'idle' | 'copied' | 'failed';

type CopyState<Subject extends string> = { outcome: CopyOutcome; subject: Subject | null; text: string; copyCount: number };

// subject names what was copied, so one status line can confirm several copy buttons.
export function useClipboardCopy<Subject extends string>() {
  const [state, setState] = useState<CopyState<Subject>>({ outcome: 'idle', subject: null, text: '', copyCount: 0 });

  useEffect(() => {
    if (state.outcome !== 'copied') return;
    const timer = setTimeout(() => setState((current) => ({ ...current, outcome: 'idle' })), gameConfig.copyConfirmationSeconds * 1000);
    return () => clearTimeout(timer);
  }, [state.outcome, state.copyCount]);

  async function copy(subject: Subject, text: string): Promise<void> {
    const outcome = await writeToClipboard(text);
    setState((current) => ({ outcome, subject, text, copyCount: current.copyCount + 1 }));
  }

  return { ...state, copy };
}

async function writeToClipboard(text: string): Promise<CopyOutcome> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
