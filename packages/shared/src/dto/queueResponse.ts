// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { QueueResponseItemSchema } from "./queueResponseItem";

export const QueueResponseSchema = z.object({
    currentQueueMediaId: z.number().nullable(),
    queue: z.array(z.lazy(() => QueueResponseItemSchema)),
    queueType: z.enum(["RANDOM", "SORTED"]),
    offset: z.number().default(0),
    total: z.number().default(0),
});

export type QueueResponse = z.infer<typeof QueueResponseSchema>;
