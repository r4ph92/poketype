import { z } from 'zod';

const pusherSocketId = /^\d{1,20}\.\d{1,20}$/;

export const channelAuthRequestSchema = z.strictObject({ socketId: z.string().regex(pusherSocketId) });
