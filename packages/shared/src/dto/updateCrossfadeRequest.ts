// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const UpdateCrossfadeRequestSchema = z.object({
    crossfade: z.number(),
});

export type UpdateCrossfadeRequest = z.infer<
    typeof UpdateCrossfadeRequestSchema
>;
