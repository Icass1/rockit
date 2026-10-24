// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const StartFromSearchRequestSchema = z.object({
    artistName: z.string(),
    trackName: z.string(),
    addToLibrary: z.boolean().default(true),
    addToPlaylist: z.boolean().default(false),
    playlistPublicId: z.string().nullable(),
});

export type StartFromSearchRequest = z.infer<
    typeof StartFromSearchRequestSchema
>;
