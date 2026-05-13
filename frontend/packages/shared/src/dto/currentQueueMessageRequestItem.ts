// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CurrentQueueMessageRequestItemSchema = z.object({
    mediaPublicId: z.string(),
    listPublicId: z.string(),
    queueMediaId: z.number(),
    queueType: z.enum(["RANDOM", "SORTED"]),
});

export type CurrentQueueMessageRequestItem = z.infer<
    typeof CurrentQueueMessageRequestItemSchema
>;
