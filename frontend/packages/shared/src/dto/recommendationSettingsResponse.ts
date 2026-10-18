// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const RecommendationSettingsResponseSchema = z.object({
    externalEnabled: z.boolean(),
    listenbrainzUsername: z.string().nullable(),
    availableProviders: z.array(z.string()),
});

export type RecommendationSettingsResponse = z.infer<
    typeof RecommendationSettingsResponseSchema
>;
