// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UserLevelResponseSchema = z.object({
    userId: z.string(),
    username: z.string(),
    imageUrl: z.string().nullable(),
    level: z.number(),
    xp: z.number(),
    xpToNext: z.number().default(0),
    title: z.string().default(""),
    streak: z.number().default(0),
});

export type UserLevelResponse = z.infer<typeof UserLevelResponseSchema>;
