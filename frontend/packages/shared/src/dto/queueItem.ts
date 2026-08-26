// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const QueueItemSchema = z.object({
    mediaPublicId: z.string(),
    listPublicId: z.string().nullable(),
    queueMediaId: z.number(),
    randomIndex: z.number(),
    sortedIndex: z.number(),
});

export type QueueItem = z.infer<typeof QueueItemSchema>;
