// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const StatsSummaryResponseSchema = z.object({
    mediasListened: z.number(),
    songsListened: z.number(),
    videosListened: z.number(),
    minutesListened: z.number(),
    avgMinutesPerSong: z.number(),
    currentStreak: z.number(),
});

export type StatsSummaryResponse = z.infer<typeof StatsSummaryResponseSchema>;
