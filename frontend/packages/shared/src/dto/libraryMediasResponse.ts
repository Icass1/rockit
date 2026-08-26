// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { BaseAlbumWithoutSongsResponseSchema } from './baseAlbumWithoutSongsResponse';
import { BaseSongWithAlbumResponseSchema } from './baseSongWithAlbumResponse';
import { LibraryResponseItemSchema } from './libraryResponseItem';
import { BaseVideoResponseSchema } from './baseVideoResponse';
import { BaseStationResponseSchema } from './baseStationResponse';
import { BasePlaylistWithoutMediasResponseSchema } from './basePlaylistWithoutMediasResponse';

export const LibraryMediasResponseSchema = z.object({
    albums: z.array(z.lazy(() => LibraryResponseItemSchema).unwrap().extend({ item: z.union([z.lazy(() => BaseAlbumWithoutSongsResponseSchema)]) })),
    playlists: z.array(z.lazy(() => LibraryResponseItemSchema).unwrap().extend({ item: z.union([z.lazy(() => BasePlaylistWithoutMediasResponseSchema)]) })),
    songs: z.array(z.lazy(() => LibraryResponseItemSchema).unwrap().extend({ item: z.union([z.lazy(() => BaseSongWithAlbumResponseSchema)]) })),
    videos: z.array(z.lazy(() => LibraryResponseItemSchema).unwrap().extend({ item: z.union([z.lazy(() => BaseVideoResponseSchema)]) })),
    stations: z.array(z.lazy(() => LibraryResponseItemSchema).unwrap().extend({ item: z.union([z.lazy(() => BaseStationResponseSchema)]) })),
    shared: z.array(z.lazy(() => LibraryResponseItemSchema).unwrap().extend({ item: z.union([z.lazy(() => BasePlaylistWithoutMediasResponseSchema)]) })),
});

export type LibraryMediasResponse = z.infer<typeof LibraryMediasResponseSchema>;