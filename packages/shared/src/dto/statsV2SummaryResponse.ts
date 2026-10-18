// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const StatsV2SummaryResponseSchema = z.object({
    uniqueMediasListened: z.number(),
    uniqueSongsListened: z.number(),
    uniqueVideosListened: z.number(),
    totalListenSessions: z.number(),
    totalPlayTimeMs: z.number(),
    totalPlayTimeMinutes: z.number(),
    avgPlayTimePerMediaMs: z.number(),
    currentStreak: z.number(),
});

export type StatsV2SummaryResponse = z.infer<
    typeof StatsV2SummaryResponseSchema
>;
