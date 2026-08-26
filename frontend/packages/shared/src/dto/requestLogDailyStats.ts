// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RequestLogDailyStatsSchema = z.object({
    date: z.string(),
    count: z.number(),
    avgTimeMs: z.number(),
});

export type RequestLogDailyStats = z.infer<typeof RequestLogDailyStatsSchema>;
