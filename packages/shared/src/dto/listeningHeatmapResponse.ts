// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { ListeningHeatmapSegmentSchema } from "./listeningHeatmapSegment";

export const ListeningHeatmapResponseSchema = z.object({
    segments: z.array(z.lazy(() => ListeningHeatmapSegmentSchema)).default([]),
});

export type ListeningHeatmapResponse = z.infer<
    typeof ListeningHeatmapResponseSchema
>;
