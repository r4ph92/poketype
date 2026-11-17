'use client';

import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { RoomId } from '@/domain/room-id';
import { invitationStorageKey, parseStoredLinks, readStoredLinksText, rememberLink, subscribeToStoredLinks } from './invitation-link-store';
import { requestInvitation } from './request-invitation';

export type CreationState = 'idle' | 'pending' | 'too-many' | 'failed';

// The new link appears in the list with the next snapshot; its token is remembered first, so the row shows its copy button at once.
export function useInvitationLinks(roomId: RoomId, viewerMemberKey: string) {
  const key = invitationStorageKey(roomId, viewerMemberKey);
  const storedText = useSyncExternalStore(subscribeToStoredLinks, () => readStoredLinksText(key), () => null);
  const links = useMemo(() => parseStoredLinks(storedText), [storedText]);
  const [creation, setCreation] = useState<CreationState>('idle');
  const isRequesting = useRef(false);

  async function create(): Promise<void> {
    if (isRequesting.current) return;
    isRequesting.current = true;
    setCreation('pending');
    const result = await requestInvitation(roomId);
    if (result.outcome === 'created') rememberLink(key, result.invitation.id, result.invitation.token);
    setCreation(result.outcome === 'created' ? 'idle' : result.outcome);
    isRequesting.current = false;
  }

  return { links, creation, create: () => void create() };
}
