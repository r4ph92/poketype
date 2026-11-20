import { SubmitButton } from '@/components/pixel/SubmitButton';
import { createRoom } from '../create-room';

// Sends no visibility choice, so the room opens public with the default configuration.
export function CreatePublicRoomButton({ label }: { label: string }) {
  return (
    <form action={createRoom}>
      <SubmitButton label={label} />
    </form>
  );
}
