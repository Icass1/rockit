import { QueueResponseItemSchema } from "@/dto";
import { z } from "zod";

export const QueueResponseSchema = z.object({
    currentQueueMediaId: z.number().nullable(),
    queue: z.array(z.lazy(() => QueueResponseItemSchema)),
});

export type QueueResponse = z.infer<typeof QueueResponseSchema>;
