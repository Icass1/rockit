import { z } from "zod";
import { BaseAlbumWithoutSongsResponseSchema } from "./baseAlbumWithoutSongsResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";

export const YoutubeMusicArtistResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    imageUrl: z.string(),
    youtubeId: z.string(),
    topSongs: z
        .array(z.lazy(() => BaseSongWithAlbumResponseSchema))
        .default([]),
    albums: z
        .array(z.lazy(() => BaseAlbumWithoutSongsResponseSchema))
        .default([]),
});

export type YoutubeMusicArtistResponse = z.infer<
    typeof YoutubeMusicArtistResponseSchema
>;
