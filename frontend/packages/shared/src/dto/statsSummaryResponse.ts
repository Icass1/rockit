// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const StatsSummaryResponseSchema = z.object({
    songsListened: z.number(),
    minutesListened: z.number(),
    avgMinutesPerSong: z.number(),
    currentStreak: z.number(),
    topGenre: z.string().default(""),
});

export type StatsSummaryResponse = z.infer<typeof StatsSummaryResponseSchema>;
