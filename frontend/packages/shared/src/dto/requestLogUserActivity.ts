// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RequestLogUserActivitySchema = z.object({
    userId: z.number().nullable(),
    username: z.string().nullable(),
    requestCount: z.number(),
    avgTimeMs: z.number(),
});

export type RequestLogUserActivity = z.infer<
    typeof RequestLogUserActivitySchema
>;
