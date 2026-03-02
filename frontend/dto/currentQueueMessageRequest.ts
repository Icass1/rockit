import { z } from "zod";
import { CurrentQueueMessageRequestItemSchema } from "@/dto";

export const CurrentQueueMessageRequestSchema = z.object({
    queue: z.array(z.lazy(() => CurrentQueueMessageRequestItemSchema)),
});

export type CurrentQueueMessageRequest = z.infer<
    typeof CurrentQueueMessageRequestSchema
>;
