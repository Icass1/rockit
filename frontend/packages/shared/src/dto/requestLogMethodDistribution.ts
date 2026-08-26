// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RequestLogMethodDistributionSchema = z.object({
    method: z.string(),
    count: z.number(),
    avgTimeMs: z.number(),
});

export type RequestLogMethodDistribution = z.infer<
    typeof RequestLogMethodDistributionSchema
>;
