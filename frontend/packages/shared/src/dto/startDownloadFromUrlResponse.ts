// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseSongWithAlbumResponseSchema } from './baseSongWithAlbumResponse';
import { BasePlaylistWithMediasResponseSchema } from './basePlaylistWithMediasResponse';
import { BaseVideoResponseSchema } from './baseVideoResponse';
import { BaseStationResponseSchema } from './baseStationResponse';
import { BaseArtistResponseSchema } from './baseArtistResponse';
import { BasePlaylistWithoutMediasResponseSchema } from './basePlaylistWithoutMediasResponse';
import { BaseAlbumWithSongsResponseSchema } from './baseAlbumWithSongsResponse';

export const StartDownloadFromUrlResponseSchema = z.object({
    data: z.union([z.lazy(() => BaseSongWithAlbumResponseSchema), z.lazy(() => BaseVideoResponseSchema), z.lazy(() => BasePlaylistWithoutMediasResponseSchema), z.lazy(() => BasePlaylistWithMediasResponseSchema), z.lazy(() => BaseAlbumWithSongsResponseSchema), z.lazy(() => BaseArtistResponseSchema), z.lazy(() => BaseStationResponseSchema)]),
    downloadGroupId: z.string(),
});

export type StartDownloadFromUrlResponse = z.infer<typeof StartDownloadFromUrlResponseSchema>;