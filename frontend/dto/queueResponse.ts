import { z } from "zod";
import { QueueResponseItemSchema } from "@/dto";

export const QueueResponseSchema = z.object({
    currentQueueSongId: z.number().nullable(),
    queue: z.array(z.lazy(() => QueueResponseItemSchema)),
});

export type QueueResponse = z.infer<typeof QueueResponseSchema>;
