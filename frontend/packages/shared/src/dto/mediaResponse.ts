// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";
import { BaseAlbumWithSongsResponseSchema } from "./baseAlbumWithSongsResponse";
import { BaseArtistResponseSchema } from "./baseArtistResponse";
import { BasePlaylistWithoutMediasResponseSchema } from "./basePlaylistWithoutMediasResponse";
import { BaseSongWithAlbumResponseSchema } from "./baseSongWithAlbumResponse";
import { BaseVideoResponseSchema } from "./baseVideoResponse";

export const MediaResponseSchema = z.union([
    z.lazy(() => BaseSongWithAlbumResponseSchema),
    z.lazy(() => BaseAlbumWithSongsResponseSchema),
    z.lazy(() => BaseArtistResponseSchema),
    z.lazy(() => BasePlaylistWithoutMediasResponseSchema),
    z.lazy(() => BaseVideoResponseSchema),
]);

export type MediaResponse = z.infer<typeof MediaResponseSchema>;
