// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const FriendStreakResponseSchema = z.object({
    currentStreak: z.number(),
});

export type FriendStreakResponse = z.infer<typeof FriendStreakResponseSchema>;
