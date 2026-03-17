import { z } from "zod";
import { CurrentQueueMessageRequestItemSchema } from "@/packages/dto";

export const CurrentQueueMessageRequestSchema = z.object({
    queue: z.array(z.lazy(() => CurrentQueueMessageRequestItemSchema)),
    queueType: z.any(),
});

export type CurrentQueueMessageRequest = z.infer<
    typeof CurrentQueueMessageRequestSchema
>;
