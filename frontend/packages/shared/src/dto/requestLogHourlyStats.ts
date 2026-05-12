// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RequestLogHourlyStatsSchema = z.object({
    hour: z.number(),
    count: z.number(),
    avgTimeMs: z.number(),
});

export type RequestLogHourlyStats = z.infer<typeof RequestLogHourlyStatsSchema>;
