// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseAlbumWithSongsResponseSchema } from "./baseAlbumWithSongsResponse";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BasePlaylistForPlaylistResponseSchema } from "./basePlaylistForPlaylistResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseStationResponseSchema } from "./baseStationResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";
import { PlaylistContributorSchema } from "./playlistContributor";
import { PlaylistResponseItemSchema } from "./playlistResponseItem";

export const BasePlaylistWithMediasResponseSchema = z.object({
    type: z.union([z.literal("playlist")]).default("playlist"),
    description: z.string().nullable(),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    contributors: z.array(z.lazy(() => PlaylistContributorSchema)),
    imageUrl: z.string(),
    owner: z.lazy(() => BaseArtistResponseSchema),
    dateAdded: z.iso.datetime().nullable(),
    medias: z.array(
        z.union([
            z
                .lazy(() => PlaylistResponseItemSchema)
                .unwrap()
                .extend({
                    item: z.union([
                        z.lazy(() => BaseSongWithAlbumResponseSchema),
                    ]),
                }),
            z
                .lazy(() => PlaylistResponseItemSchema)
                .unwrap()
                .extend({
                    item: z.union([z.lazy(() => BaseVideoResponseSchema)]),
                }),
            z
                .lazy(() => PlaylistResponseItemSchema)
                .unwrap()
                .extend({
                    item: z.union([z.lazy(() => BaseStationResponseSchema)]),
                }),
            z
                .lazy(() => PlaylistResponseItemSchema)
                .unwrap()
                .extend({
                    item: z.union([
                        z.lazy(() => BasePlaylistForPlaylistResponseSchema),
                    ]),
                }),
            z
                .lazy(() => PlaylistResponseItemSchema)
                .unwrap()
                .extend({
                    item: z.union([
                        z.lazy(() => BaseAlbumWithSongsResponseSchema),
                    ]),
                }),
        ])
    ),
});

export type BasePlaylistWithMediasResponse = z.infer<
    typeof BasePlaylistWithMediasResponseSchema
>;
