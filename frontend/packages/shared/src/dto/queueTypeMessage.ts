// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const QueueTypeMessageSchema = z.object({
    type: z.union([z.literal("queue_type")]).default("queue_type"),
    queueType: z.enum(["RANDOM", "SORTED"]),
});

export type QueueTypeMessage = z.infer<typeof QueueTypeMessageSchema>;
