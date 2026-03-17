import { CurrentQueueMessageRequestItemSchema } from "@/dto";
import { z } from "zod";

export const CurrentQueueMessageRequestSchema = z.object({
    queue: z.array(z.lazy(() => CurrentQueueMessageRequestItemSchema)),
    queueType: z.any(),
});

export type CurrentQueueMessageRequest = z.infer<
    typeof CurrentQueueMessageRequestSchema
>;
