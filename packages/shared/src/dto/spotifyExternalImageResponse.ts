// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const SpotifyExternalImageResponseSchema = z.object({
    url: z.string(),
    width: z.number().nullable().default(null),
    height: z.number().nullable().default(null),
});

export type SpotifyExternalImageResponse = z.infer<
    typeof SpotifyExternalImageResponseSchema
>;
