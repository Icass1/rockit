// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseAlbumWithoutSongsResponseSchema } from "./baseAlbumWithoutSongsResponse";
import { BasePlaylistWithoutMediasResponseSchema } from "./basePlaylistWithoutMediasResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseStationResponseSchema } from "./baseStationResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";

export const LibraryListsResponseSchema = z.object({
    albums: z.array(z.lazy(() => BaseAlbumWithoutSongsResponseSchema)),
    playlists: z.array(z.lazy(() => BasePlaylistWithoutMediasResponseSchema)),
    songs: z.array(z.lazy(() => BaseSongWithAlbumResponseSchema)),
    videos: z.array(z.lazy(() => BaseVideoResponseSchema)),
    stations: z.array(z.lazy(() => BaseStationResponseSchema)),
    shared: z.array(z.lazy(() => BasePlaylistWithoutMediasResponseSchema)),
});

export type LibraryListsResponse = z.infer<typeof LibraryListsResponseSchema>;
