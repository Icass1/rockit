// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const RecommendationTrackRequestSchema = z.object({
    artist: z.string(),
    track: z.string(),
});

export type RecommendationTrackRequest = z.infer<
    typeof RecommendationTrackRequestSchema
>;
