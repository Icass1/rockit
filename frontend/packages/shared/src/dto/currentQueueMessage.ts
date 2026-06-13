// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { CurrentQueueMessageItemSchema } from "./currentQueueMessageItem";

export const CurrentQueueMessageSchema = z.object({
    type: z.union([z.literal("current_queue")]).default("current_queue"),
    queue: z.array(z.lazy(() => CurrentQueueMessageItemSchema)),
});

export type CurrentQueueMessage = z.infer<typeof CurrentQueueMessageSchema>;
