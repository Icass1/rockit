// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BaseSongWithoutAlbumResponseSchema } from "./baseSongWithoutAlbumResponse";
import { SpotifyScrapperExternalImageResponseSchema } from "./spotifyScrapperExternalImageResponse";

export const SpotifyScrapperAlbumResponseSchema = z.object({
    type: z.union([z.literal("album")]).default("album"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    imageUrl: z.string(),
    dominantColor: z.string().nullable(),
    undownloadedCount: z.number().default(0),
    songs: z.array(z.lazy(() => BaseSongWithoutAlbumResponseSchema)),
    spotifyId: z.string(),
    externalImages: z.array(
        z.lazy(() => SpotifyScrapperExternalImageResponseSchema)
    ),
});

export type SpotifyScrapperAlbumResponse = z.infer<
    typeof SpotifyScrapperAlbumResponseSchema
>;
