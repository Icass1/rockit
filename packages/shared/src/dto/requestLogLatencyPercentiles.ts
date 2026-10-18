// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RequestLogLatencyPercentilesSchema = z.object({
    p50Ms: z.number(),
    p90Ms: z.number(),
    p95Ms: z.number(),
    p99Ms: z.number(),
});

export type RequestLogLatencyPercentiles = z.infer<
    typeof RequestLogLatencyPercentilesSchema
>;
