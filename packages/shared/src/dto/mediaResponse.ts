// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseAlbumWithSongsResponseSchema } from "./baseAlbumWithSongsResponse";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BasePlaylistWithMediasResponseSchema } from "./basePlaylistWithMediasResponse";
import { BasePlaylistWithoutMediasResponseSchema } from "./basePlaylistWithoutMediasResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseStationResponseSchema } from "./baseStationResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";

export const MediaResponseSchema = z.object({
    media: z.union([
        z.lazy(() => BaseSongWithAlbumResponseSchema),
        z.lazy(() => BaseAlbumWithSongsResponseSchema),
        z.lazy(() => BaseArtistResponseSchema),
        z.lazy(() => BasePlaylistWithMediasResponseSchema),
        z.lazy(() => BasePlaylistWithoutMediasResponseSchema),
        z.lazy(() => BaseVideoResponseSchema),
        z.lazy(() => BaseStationResponseSchema),
    ]),
});

export type MediaResponse = z.infer<typeof MediaResponseSchema>;
