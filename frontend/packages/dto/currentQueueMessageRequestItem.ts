import { z } from "zod";

export const CurrentQueueMessageRequestItemSchema = z.object({
    publicId: z.string(),
    queueMediaId: z.number(),
});

export type CurrentQueueMessageRequestItem = z.infer<
    typeof CurrentQueueMessageRequestItemSchema
>;
