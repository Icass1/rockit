// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const StatsInsightsResponseSchema = z.object({
    activeDays: z.number(),
    longestStreak: z.number(),
    longestSessionMs: z.number(),
    averageSessionMs: z.number(),
    completionRate: z.number(),
    replayRate: z.number(),
    discoveryCount: z.number(),
    likesAdded: z.number(),
    libraryAdds: z.number(),
    skips: z.number(),
    seekCount: z.number(),
    minutesSkipped: z.number(),
    peakHour: z.number().nullable(),
    peakDay: z.string().nullable(),
    nightOwlMinutes: z.number(),
    earlyBirdMinutes: z.number(),
});

export type StatsInsightsResponse = z.infer<typeof StatsInsightsResponseSchema>;
