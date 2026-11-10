import type { RoomId } from '@/domain/room-id';
import { roomRouteParamsSchema } from './room-schemas';

export async function readRoomId({ params }: { params: Promise<unknown> }): Promise<RoomId | null> {
  const parsed = roomRouteParamsSchema.safeParse(await params);
  return parsed.success ? parsed.data.roomId : null;
}
