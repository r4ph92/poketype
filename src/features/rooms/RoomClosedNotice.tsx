'use client';

import { useEffect } from 'react';
import { DialogueBox } from '@/components/pixel/DialogueBox';

// The flag is read once: dropping it from the address keeps a reload or a shared link from showing the notice again.
export function RoomClosedNotice({ message }: { message: string }) {
  useEffect(() => {
    window.history.replaceState(window.history.state, '', '/play');
  }, []);
  return (
    <DialogueBox live="status">
      <p>{message}</p>
    </DialogueBox>
  );
}
