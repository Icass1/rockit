// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const SpotifyScrapperExternalImageResponseSchema = z.object({
    url: z.string(),
    width: z.number().nullable(),
    height: z.number().nullable(),
});

export type SpotifyScrapperExternalImageResponse = z.infer<
    typeof SpotifyScrapperExternalImageResponseSchema
>;
