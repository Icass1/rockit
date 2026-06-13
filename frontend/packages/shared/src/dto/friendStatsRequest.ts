// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const FriendStatsRequestSchema = z.object({
    range: z.string().default("7d"),
});

export type FriendStatsRequest = z.infer<typeof FriendStatsRequestSchema>;
