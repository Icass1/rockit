// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RequestLogRouteStatsSchema = z.object({
    normalizedRoute: z.string(),
    method: z.string(),
    count: z.number(),
    avgTimeMs: z.number(),
    minTimeMs: z.number(),
    maxTimeMs: z.number(),
});

export type RequestLogRouteStats = z.infer<typeof RequestLogRouteStatsSchema>;
