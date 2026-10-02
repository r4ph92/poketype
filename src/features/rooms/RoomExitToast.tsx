'use client';

import { useEffect, useState } from 'react';
import { Toast } from '@/components/pixel/Toast';

// Says why the player was sent home from a room. Like the host-closed notice, the flag is read once and dropped from the address,
// so a reload never shows it again.
export function RoomExitToast({ message, dismissLabel }: { message: string; dismissLabel: string }) {
  const [isOpen, setIsOpen] = useState(true);
  useEffect(() => {
    window.history.replaceState(window.history.state, '', '/play');
  }, []);
  return <Toast isOpen={isOpen} message={message} dismissLabel={dismissLabel} onDismiss={() => setIsOpen(false)} />;
}
