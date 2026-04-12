// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const StatsHeatmapCellResponseSchema = z.object({
    hour: z.number(),
    day: z.number(),
    value: z.number(),
});

export type StatsHeatmapCellResponse = z.infer<
    typeof StatsHeatmapCellResponseSchema
>;
