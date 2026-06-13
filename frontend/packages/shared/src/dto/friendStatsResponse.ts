// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const FriendStatsResponseSchema = z.object({
    username: z.string(),
    imageUrl: z.string().nullable(),
    minutesListened: z.number().default(0),
    songsListened: z.number().default(0),
    currentStreak: z.number().default(0),
    level: z.number().default(1),
    xp: z.number().default(0),
});

export type FriendStatsResponse = z.infer<typeof FriendStatsResponseSchema>;
