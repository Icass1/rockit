// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { QueueResponseItemSchema } from "./queueResponseItem";

export const QueueResponseSchema = z.object({
    currentQueueMediaId: z.number().nullable(),
    queue: z.array(z.lazy(() => QueueResponseItemSchema)),
});

export type QueueResponse = z.infer<typeof QueueResponseSchema>;
