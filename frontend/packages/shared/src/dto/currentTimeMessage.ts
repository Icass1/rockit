// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CurrentTimeMessageSchema = z.object({
    type: z.union([z.literal("current_time")]).default("current_time"),
    currentTimeMs: z.number(),
});

export type CurrentTimeMessage = z.infer<typeof CurrentTimeMessageSchema>;
