// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const UpdateContentRatingRequestSchema = z.object({
    value: z.union([
        z.literal("explicit"),
        z.literal("clean"),
        z.literal("unknown"),
    ]),
});

export type UpdateContentRatingRequest = z.infer<
    typeof UpdateContentRatingRequestSchema
>;
