// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CurrentQueueMessageItemSchema = z.object({
    mediaPublicId: z.string(),
    listPublicId: z.string().nullable(),
    queueMediaId: z.number(),
    randomIndex: z.number(),
    sortedIndex: z.number(),
});

export type CurrentQueueMessageItem = z.infer<
    typeof CurrentQueueMessageItemSchema
>;
