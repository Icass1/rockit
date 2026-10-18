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

export const StartDownloadFromUrlResponseSchema = z.object({
    data: z.union([
        z.lazy(() => BaseSongWithAlbumResponseSchema),
        z.lazy(() => BaseVideoResponseSchema),
        z.lazy(() => BasePlaylistWithoutMediasResponseSchema),
        z.lazy(() => BasePlaylistWithMediasResponseSchema),
        z.lazy(() => BaseAlbumWithSongsResponseSchema),
        z.lazy(() => BaseArtistResponseSchema),
        z.lazy(() => BaseStationResponseSchema),
    ]),
    downloadGroupId: z.string(),
});

export type StartDownloadFromUrlResponse = z.infer<
    typeof StartDownloadFromUrlResponseSchema
>;
