// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { MediaResponseSchema } from "./mediaResponse";

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
    currentStreak: z.number().default(0),
    minutesListenedThisWeek: z.number().default(0.0),
    recentlyClickedMedia: z
        .array(z.lazy(() => MediaResponseSchema))
        .default([]),
});

export type HomeStatsResponse = z.infer<typeof HomeStatsResponseSchema>;
