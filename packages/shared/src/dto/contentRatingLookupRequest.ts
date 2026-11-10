// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ContentRatingLookupRequestSchema = z.object({
    publicIds: z.array(z.string()),
});

export type ContentRatingLookupRequest = z.infer<
    typeof ContentRatingLookupRequestSchema
>;
