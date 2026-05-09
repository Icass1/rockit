// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BaseAlbumWithoutSongsResponseSchema } from "./baseAlbumWithoutSongsResponse";
import { BaseAlbumWithSongsResponseSchema } from "./baseAlbumWithSongsResponse";
import { BasePlaylistForPlaylistResponseSchema } from "./basePlaylistForPlaylistResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseStationResponseSchema } from "./baseStationResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";
import { PlaylistContributorResponseSchema } from "./playlistContributorResponse";
import { PlaylistResponseItemSchema } from "./playlistResponseItem";

export const BasePlaylistWithMediasResponseSchema = z.object({
    type: z.union([z.literal("playlist")]).default("playlist"),
    description: z.string().nullable(),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    contributors: z.array(z.lazy(() => PlaylistContributorResponseSchema)),
    imageUrl: z.string(),
    owner: z.string(),
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
                        z.lazy(() => BaseAlbumWithoutSongsResponseSchema),
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
