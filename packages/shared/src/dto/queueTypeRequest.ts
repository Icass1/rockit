// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const QueueTypeRequestSchema = z.object({
    queueType: z.enum(["RANDOM", "SORTED"]),
});

export type QueueTypeRequest = z.infer<typeof QueueTypeRequestSchema>;
