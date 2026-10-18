// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RequestLogCodeDistributionSchema = z.object({
    code: z.number(),
    count: z.number(),
});

export type RequestLogCodeDistribution = z.infer<
    typeof RequestLogCodeDistributionSchema
>;
