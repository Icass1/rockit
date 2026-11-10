// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { ContentRatingResponseSchema } from "./contentRatingResponse";

export const ContentRatingLookupResponseSchema = z.object({
    items: z.array(z.lazy(() => ContentRatingResponseSchema)),
});

export type ContentRatingLookupResponse = z.infer<
    typeof ContentRatingLookupResponseSchema
>;
