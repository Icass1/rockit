// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const AdminRequestStatsResponseSchema = z.object({
    total: z.number(),
    pending: z.number(),
    accepted: z.number(),
    rejected: z.number(),
});

export type AdminRequestStatsResponse = z.infer<
    typeof AdminRequestStatsResponseSchema
>;
