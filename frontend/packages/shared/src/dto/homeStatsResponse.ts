// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";

export const HomeStatsResponseSchema = z.object({
    songsByTimePlayed: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
    randomSongsLastMonth: z.array(
        z.lazy(() => BaseSongWithAlbumResponseSchema)
    ),
    nostalgicMix: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
    hiddenGems: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
    communityTop: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
    monthlyTop: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
    moodSongs: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
});

export type HomeStatsResponse = z.infer<typeof HomeStatsResponseSchema>;
