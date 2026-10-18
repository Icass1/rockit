// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import {
    BaseAlbumWithSongsResponseSchema,
    type BaseAlbumWithSongsResponse,
} from "./baseAlbumWithSongsResponse";
import {
    BaseSongWithAlbumResponseSchema,
    type BaseSongWithAlbumResponse,
} from "./baseSongWithAlbumResponse";
import {
    BaseStationResponseSchema,
    type BaseStationResponse,
} from "./baseStationResponse";
import {
    BaseVideoResponseSchema,
    type BaseVideoResponse,
} from "./baseVideoResponse";
import {
    PlaylistContributorSchema,
    type PlaylistContributor,
} from "./playlistContributor";
import {
    PlaylistResponseItemSchema,
    type PlaylistResponseItem,
} from "./playlistResponseItem";

export type BasePlaylistForPlaylistResponse = {
    type: "playlist";
    provider: string;
    publicId: string;
    url: string;
    providerUrl: string;
    name: string;
    imageUrl: string;
    owner: string;
    description: string | null;
    itemCount: number;
    medias: Array<
        | (Omit<PlaylistResponseItem, "item"> & {
              item: BaseSongWithAlbumResponse;
          })
        | (Omit<PlaylistResponseItem, "item"> & { item: BaseVideoResponse })
        | (Omit<PlaylistResponseItem, "item"> & { item: BaseStationResponse })
        | (Omit<PlaylistResponseItem, "item"> & {
              item: BasePlaylistForPlaylistResponse;
          })
        | (Omit<PlaylistResponseItem, "item"> & {
              item: BaseAlbumWithSongsResponse;
          })
    >;
    contributors: Array<PlaylistContributor>;
};

export const BasePlaylistForPlaylistResponseSchema: z.ZodType<BasePlaylistForPlaylistResponse> =
    z.lazy(() =>
        z.object({
            type: z.union([z.literal("playlist")]).default("playlist"),
            provider: z.string(),
            publicId: z.string(),
            url: z.string(),
            providerUrl: z.string(),
            name: z.string(),
            imageUrl: z.string(),
            owner: z.string(),
            description: z.string().nullable(),
            itemCount: z.number().default(0),
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
                            item: z.union([
                                z.lazy(() => BaseVideoResponseSchema),
                            ]),
                        }),
                    z
                        .lazy(() => PlaylistResponseItemSchema)
                        .unwrap()
                        .extend({
                            item: z.union([
                                z.lazy(() => BaseStationResponseSchema),
                            ]),
                        }),
                    z
                        .lazy(() => PlaylistResponseItemSchema)
                        .unwrap()
                        .extend({
                            item: z.union([
                                z.lazy(
                                    () => BasePlaylistForPlaylistResponseSchema
                                ),
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
            contributors: z.array(z.lazy(() => PlaylistContributorSchema)),
        })
    );
