import type { StarterDestination } from '@/domain/starter-destination';

// The entry forms carry the return as hidden fields, read back by entryReturnDestination.
export function ReturnDestinationFields({ destination }: { destination: StarterDestination }) {
  if (destination.kind === 'room') return <input type="hidden" name="returnRoomId" value={destination.roomId} />;
  if (destination.kind === 'invite') return <input type="hidden" name="inviteToken" value={destination.token} />;
  return null;
}
