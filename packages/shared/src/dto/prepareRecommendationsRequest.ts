// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { RecommendationTrackRequestSchema } from "./recommendationTrackRequest";

export const PrepareRecommendationsRequestSchema = z.object({
    publicIds: z.array(z.string()).default([]),
    discover: z
        .array(z.lazy(() => RecommendationTrackRequestSchema))
        .default([]),
});

export type PrepareRecommendationsRequest = z.infer<
    typeof PrepareRecommendationsRequestSchema
>;
