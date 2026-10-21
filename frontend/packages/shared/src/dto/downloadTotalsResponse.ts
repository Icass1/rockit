// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const DownloadTotalsResponseSchema = z.object({
    total: z.number().default(0),
    active: z.number().default(0),
    completed: z.number().default(0),
    failed: z.number().default(0),
    daily: z.array(z.number()).default([]),
});

export type DownloadTotalsResponse = z.infer<
    typeof DownloadTotalsResponseSchema
>;
