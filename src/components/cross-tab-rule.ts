export function shouldRefreshOnAnnouncement(ownValue: string, announcedValue: unknown): boolean {
  return announcedValue !== ownValue;
}
