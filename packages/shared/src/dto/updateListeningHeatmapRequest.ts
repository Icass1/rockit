// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const UpdateListeningHeatmapRequestSchema = z.object({
    enabled: z.boolean(),
});

export type UpdateListeningHeatmapRequest = z.infer<
    typeof UpdateListeningHeatmapRequestSchema
>;
