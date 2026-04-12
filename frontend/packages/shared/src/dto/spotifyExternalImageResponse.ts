// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const SpotifyExternalImageResponseSchema = z.object({
    url: z.string(),
    width: z.number().nullable(),
    height: z.number().nullable(),
});

export type SpotifyExternalImageResponse = z.infer<
    typeof SpotifyExternalImageResponseSchema
>;
