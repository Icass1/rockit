import { QueueResponseItemSchema } from "@/dto/queueResponseItem";
import { z } from "zod";

export const QueueResponseSchema = z.object({
    currentQueueSongId: z.any(),
    queue: z.array(z.lazy(() => QueueResponseItemSchema)),
});

export type QueueResponse = z.infer<typeof QueueResponseSchema>;
