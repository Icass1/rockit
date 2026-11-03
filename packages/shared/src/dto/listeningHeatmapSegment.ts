// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ListeningHeatmapSegmentSchema = z.object({
    startMs: z.number(),
    endMs: z.number(),
    count: z.number(),
});

export type ListeningHeatmapSegment = z.infer<
    typeof ListeningHeatmapSegmentSchema
>;
