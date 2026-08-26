// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RequestLogTimeSeriesPointSchema = z.object({
    timestamp: z.string(),
    count: z.number(),
    avgTimeMs: z.number(),
});

export type RequestLogTimeSeriesPoint = z.infer<
    typeof RequestLogTimeSeriesPointSchema
>;
