// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseAlbumWithSongsResponseSchema } from "./baseAlbumWithSongsResponse";
import { BasePlaylistForPlaylistResponseSchema } from "./basePlaylistForPlaylistResponse";
import { BasePlaylistWithMediasResponseSchema } from "./basePlaylistWithMediasResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseStationResponseSchema } from "./baseStationResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";
import { PlaylistResponseItemSchema } from "./playlistResponseItem";

export const CollectionPageResponseSchema = z.object({
    collection: z.union([
        z.lazy(() => BasePlaylistWithMediasResponseSchema),
        z.lazy(() => BaseAlbumWithSongsResponseSchema),
    ]),
    items: z.array(
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
    offset: z.number(),
    limit: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
});

export type CollectionPageResponse = z.infer<
    typeof CollectionPageResponseSchema
>;
