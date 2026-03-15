import { BaseSongWithAlbumResponseSchema } from "@/dto";
import { z } from "zod";

export const HomeStatsResponseSchema = z.object({
    songsByTimePlayed: z
        .array(z.lazy(() => BaseSongWithAlbumResponseSchema))
        .default([]),
    randomSongsLastMonth: z
        .array(z.lazy(() => BaseSongWithAlbumResponseSchema))
        .default([]),
    nostalgicMix: z
        .array(z.lazy(() => BaseSongWithAlbumResponseSchema))
        .default([]),
    hiddenGems: z
        .array(z.lazy(() => BaseSongWithAlbumResponseSchema))
        .default([]),
    communityTop: z
        .array(z.lazy(() => BaseSongWithAlbumResponseSchema))
        .default([]),
    monthlyTop: z
        .array(z.lazy(() => BaseSongWithAlbumResponseSchema))
        .default([]),
    moodSongs: z
        .array(z.lazy(() => BaseSongWithAlbumResponseSchema))
        .default([]),
});

export type HomeStatsResponse = z.infer<typeof HomeStatsResponseSchema>;
