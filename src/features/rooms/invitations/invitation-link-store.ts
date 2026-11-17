import { isJsonObject } from '@/domain/json-guards';
import { parseInvitationToken, type InvitationToken } from '@/domain/invitation-token';
import type { RoomId } from '@/domain/room-id';

// Tokens of the links this tab created, by invitation id. The server keeps only hashes, so this is the one copy of each link.
export type StoredLinks = Readonly<Record<string, InvitationToken>>;

const listeners = new Set<() => void>();

// Session storage can be missing or blocked (a private window, cleared site data): the memory copy keeps new links for as long as the page lives.
const memory = new Map<string, string>();

// The viewer's member key is unique to this guest in this room, so another trainer signing in on the same tab never sees these links.
export function invitationStorageKey(roomId: RoomId, viewerMemberKey: string): string {
  return `poketype:invitations:${roomId}:${viewerMemberKey}`;
}

export function subscribeToStoredLinks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readStoredLinksText(key: string): string | null {
  return memory.get(key) ?? readSession(key);
}

export function rememberLink(key: string, invitationId: string, token: InvitationToken): void {
  const text = JSON.stringify({ ...parseStoredLinks(readStoredLinksText(key)), [invitationId]: token });
  memory.set(key, text);
  writeSession(key, text);
  listeners.forEach((listener) => listener());
}

export function parseStoredLinks(text: string | null): StoredLinks {
  const json = parseJson(text);
  if (!isJsonObject(json)) return {};
  return Object.fromEntries(Object.entries(json).flatMap(([id, value]) => {
    const token = parseInvitationToken(value);
    return token ? [[id, token]] : [];
  }));
}

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, text: string): void {
  try {
    window.sessionStorage.setItem(key, text);
  } catch {
    // The memory copy already holds the link.
  }
}

function parseJson(text: string | null): unknown {
  try {
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}
