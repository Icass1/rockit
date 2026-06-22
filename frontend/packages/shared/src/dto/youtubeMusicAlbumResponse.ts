// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BaseSongWithoutAlbumResponseSchema } from "./baseSongWithoutAlbumResponse";

export const YoutubeMusicAlbumResponseSchema = z.object({
    type: z.union([z.literal("album")]).default("album"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    imageUrl: z.string(),
    undownloadedCount: z.number().default(0),
    dateAdded: z.iso.datetime().nullable(),
    songs: z.array(z.lazy(() => BaseSongWithoutAlbumResponseSchema)),
    youtubeId: z.string(),
    year: z.number().nullable(),
});

export type YoutubeMusicAlbumResponse = z.infer<
    typeof YoutubeMusicAlbumResponseSchema
>;
