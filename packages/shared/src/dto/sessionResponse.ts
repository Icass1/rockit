// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const SessionResponseSchema = z.object({
    username: z.string(),
    image: z.string(),
    admin: z.boolean(),
    queueType: z.enum(["RANDOM", "SORTED"]),
    repeatMode: z.enum(["OFF", "ONE", "ALL"]),
    currentTimeMs: z.number().nullable(),
    volume: z.number().default(1),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
