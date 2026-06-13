// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { QueueItemSchema } from "./queueItem";

export const CurrentQueueMessageSchema = z.object({
    type: z.union([z.literal("current_queue")]).default("current_queue"),
    queue: z.array(z.lazy(() => QueueItemSchema)),
});

export type CurrentQueueMessage = z.infer<typeof CurrentQueueMessageSchema>;
