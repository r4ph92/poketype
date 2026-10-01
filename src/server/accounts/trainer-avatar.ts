import 'server-only';
import { eq } from 'drizzle-orm';
import { isTrainerAvatar } from '@/assets/trainers';
import type { UserId } from '@/domain/user-id';
import { database } from '@/server/db/client';
import { users } from '@/server/db/schema';

export async function readTrainerAvatar(userId: UserId) {
  const [user] = await database.select({ avatar: users.trainerAvatar }).from(users).where(eq(users.id, userId));
  return isTrainerAvatar(user?.avatar) ? user.avatar : null;
}
