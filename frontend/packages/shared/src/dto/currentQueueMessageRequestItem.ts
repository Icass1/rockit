// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const CurrentQueueMessageRequestItemSchema = z.object({
    publicId: z.string(),
    queueMediaId: z.number(),
});

export type CurrentQueueMessageRequestItem = z.infer<
    typeof CurrentQueueMessageRequestItemSchema
>;
