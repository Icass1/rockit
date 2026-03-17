import { z } from "zod";
import { QueueResponseItemSchema } from "@/packages/dto";

export const QueueResponseSchema = z.object({
    currentQueueMediaId: z.number().nullable(),
    queue: z.array(z.lazy(() => QueueResponseItemSchema)),
});

export type QueueResponse = z.infer<typeof QueueResponseSchema>;
