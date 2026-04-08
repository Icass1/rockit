import { z } from "zod";
import { CurrentQueueMessageRequestItemSchema } from "./currentQueueMessageRequestItem";

export const CurrentQueueMessageRequestSchema = z.object({
    queue: z.array(z.lazy(() => CurrentQueueMessageRequestItemSchema)),
    queueType: z.enum(["RANDOM", "SORTED"]),
});

export type CurrentQueueMessageRequest = z.infer<
    typeof CurrentQueueMessageRequestSchema
>;
