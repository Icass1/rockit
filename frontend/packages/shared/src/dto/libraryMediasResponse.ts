// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BaseAlbumWithoutSongsResponseSchema } from "./baseAlbumWithoutSongsResponse";
import { BasePlaylistResponseSchema } from "./basePlaylistResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseStationResponseSchema } from "./baseStationResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";

export const LibraryMediasResponseSchema = z.object({
    albums: z.array(z.lazy(() => BaseAlbumWithoutSongsResponseSchema)),
    playlists: z.array(z.lazy(() => BasePlaylistResponseSchema)),
    songs: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
    videos: z.array(z.lazy(() => BaseVideoResponseSchema)),
    stations: z.array(z.lazy(() => BaseStationResponseSchema)),
    shared: z.array(z.lazy(() => BasePlaylistResponseSchema)),
});

export type LibraryMediasResponse = z.infer<typeof LibraryMediasResponseSchema>;
