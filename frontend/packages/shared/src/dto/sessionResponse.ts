// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const SessionResponseSchema = z.object({
    username: z.string(),
    image: z.string(),
    admin: z.boolean(),
    queueType: z.enum(["RANDOM", "SORTED"]),
    currentTimeMs: z.number().nullable(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
