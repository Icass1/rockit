import { z } from 'zod';
import { QueueResponseItemSchema } from './queueResponseItem';

export const QueueResponseSchema = z.object({
    currentQueueSongId: z.any(),
    queue: z.array(z.lazy(() => QueueResponseItemSchema)),
});

export type QueueResponse = z.infer<typeof QueueResponseSchema>;