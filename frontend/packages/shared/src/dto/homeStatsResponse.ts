import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from "@/dto";

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
